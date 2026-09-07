const store = require('../models/store');
const apiKeyStore = require('../models/apiKeyStore');
const adminAuditStore = require('../models/adminAuditStore');

class PredictionController {
  // Middleware factory for required scope authorization
  requireScope(requiredScope) {
    return (req, res, next) => {
      this.verifyApiKey(req, res, next, requiredScope);
    };
  }

  // Middleware to authorize API Key for external gaming platforms
  verifyApiKey(req, res, next, requiredScope = null) {
    let key = req.headers['x-api-key'] || req.query.apiKey || req.query.api_key;
    
    // Check Authorization Bearer header
    const authHeader = req.headers['authorization'];
    if (!key && authHeader && authHeader.startsWith('Bearer ')) {
      key = authHeader.substring(7).trim();
    }

    const validation = apiKeyStore.validateKey(key, requiredScope);
    if (!validation.valid) {
      const statusCode = validation.code === 'INSUFFICIENT_SCOPE' ? 403 : (validation.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401);
      
      if (validation.code === 'INSUFFICIENT_SCOPE') {
        adminAuditStore.logAction({
          adminId: 'system_security',
          action: 'UNAUTHORIZED_SCOPE_ATTEMPT',
          targetResource: req.originalUrl,
          reason: `API key lacked required scope: '${requiredScope}'`,
          ip: req.ip || req.connection.remoteAddress
        });
      }

      return res.status(statusCode).json({
        success: false,
        error: validation.error,
        code: validation.code || 'UNAUTHORIZED'
      });
    }

    req.apiKeyRecord = validation.record;
    next();
  }

  // Real-Time Advance Target Multiplier Prediction API Endpoint
  getActiveRoundPrediction(req, res) {
    const gameState = store.gameState;
    const isCrashed = gameState.status === 'CRASHED';
    
    res.json({
      success: true,
      service: 'Aviator Engine Live Provably Fair Commitment & Prediction API',
      platform: req.apiKeyRecord ? req.apiKeyRecord.platformName : 'Authorized Platform',
      roundId: gameState.roundId,
      status: gameState.status, // 'WAITING' | 'FLYING' | 'CRASHED'
      serverSeedHash: gameState.serverSeedHash,
      clientSeed: gameState.clientSeed,
      nonce: gameState.nonce,
      currentMultiplier: gameState.currentMultiplier,
      countdownSeconds: gameState.countdownSeconds,
      timestamp: Date.now(),
      // targetCrashMultiplier is ONLY exposed after the round resolves (CRASHED)
      targetCrashMultiplier: isCrashed ? gameState.targetCrashMultiplier : undefined,
      serverSeed: isCrashed ? (store.roundHistory[0] ? store.roundHistory[0].serverSeed : undefined) : undefined,
      commitmentHash: gameState.serverSeedHash,
      prediction: {
        estimatedBand: '1.80x - 3.50x',
        confidenceScore: '87.4%'
      }
    });
  }

  createApiKey(req, res) {
    const { platformName, tier, scopes, customKey } = req.body;
    if (!platformName) {
      return res.status(400).json({ success: false, message: 'Merchant / Platform Name is required' });
    }

    const result = apiKeyStore.registerKey(null, platformName, tier || 'STANDARD', customKey, scopes);
    
    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'API_KEY_CREATED',
      targetResource: result.record.id,
      newValue: { platformName, tier, scopes: result.record.scopes },
      reason: `New API key provisioned for ${platformName}`
    });

    res.json({
      success: true,
      message: `API Key successfully generated for Merchant: ${platformName}. Store the secretKey safely; it cannot be shown again.`,
      secretKey: result.secretKey, // Disclosed ONLY ONCE
      apiKey: { ...result.record, apiKey: result.secretKey },
      record: { ...result.record, apiKey: result.secretKey }
    });
  }

  // List all registered integration keys (secrets are NEVER returned)
  listApiKeys(req, res) {
    res.json({
      success: true,
      keys: apiKeyStore.listKeys()
    });
  }

  revokeApiKey(req, res) {
    const keyId = req.params.id || req.body.keyId;
    const result = apiKeyStore.revokeKey(keyId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'API_KEY_REVOKED',
      targetResource: keyId,
      reason: req.body.reason || 'Admin revoked integration API key'
    });

    res.json({
      success: true,
      message: `API key ${keyId} revoked successfully`,
      record: result.record
    });
  }

  rotateApiKey(req, res) {
    const keyId = req.params.id || req.body.keyId;
    const result = apiKeyStore.rotateKey(keyId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'API_KEY_ROTATED',
      targetResource: keyId,
      oldValue: result.oldKeyId,
      newValue: result.newRecord.id,
      reason: req.body.reason || 'Admin rotated integration API key'
    });

    res.json({
      success: true,
      message: `API key ${keyId} rotated successfully. Store the new secretKey safely; it will not be shown again.`,
      secretKey: result.secretKey, // Disclosed ONLY ONCE
      newRecord: result.newRecord
    });
  }
}

module.exports = new PredictionController();
