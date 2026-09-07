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
    
    res.json({
      success: true,
      service: 'Aviator Engine Live Prediction & Target Multiplier API',
      platform: req.apiKeyRecord ? req.apiKeyRecord.platformName : 'Authorized Platform',
      roundId: gameState.roundId,
      status: gameState.status, // 'WAITING' | 'FLYING' | 'CRASHED'
      targetCrashMultiplier: gameState.targetCrashMultiplier,
      currentMultiplier: gameState.currentMultiplier,
      countdownSeconds: gameState.countdownSeconds,
      timestamp: Date.now(),
      hash: `sha256_${Date.now()}_${gameState.targetCrashMultiplier}`
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
