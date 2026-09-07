const store = require('../models/store');
const apiKeyStore = require('../models/apiKeyStore');

class PredictionController {
  // Middleware to authorize API Key for external gaming platforms
  verifyApiKey(req, res, next) {
    let key = req.headers['x-api-key'] || req.query.apiKey || req.query.api_key;
    
    // Check Authorization Bearer header
    const authHeader = req.headers['authorization'];
    if (!key && authHeader && authHeader.startsWith('Bearer ')) {
      key = authHeader.substring(7).trim();
    }

    const keyRecord = apiKeyStore.validateKey(key);
    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing Platform API Key',
        message: 'Pass a valid API key in x-api-key header or ?apiKey= parameter to access real-time target multiplier data.'
      });
    }

    req.apiKeyRecord = keyRecord;
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
    const { platformName, tier, customKey } = req.body;
    if (!platformName) {
      return res.status(400).json({ success: false, message: 'Merchant / Platform Name is required' });
    }

    const record = apiKeyStore.registerKey(`key_${Date.now()}`, platformName, tier || 'STANDARD', customKey);
    res.json({
      success: true,
      message: `API Key successfully generated for Merchant: ${platformName}`,
      apiKey: record,
      record
    });
  }

  // List all registered integration keys
  listApiKeys(req, res) {
    res.json({
      success: true,
      keys: apiKeyStore.listKeys()
    });
  }
}

module.exports = new PredictionController();
