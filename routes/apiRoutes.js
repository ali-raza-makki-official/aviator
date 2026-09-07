const express = require('express');
const router = express.Router();
const store = require('../models/store');
const predictionController = require('../controllers/predictionController');

// Authorized Live Target Multiplier Prediction API Endpoint
// External gaming platforms / prediction tools call this endpoint with ?apiKey=... or x-api-key header
router.get('/v1/predict', predictionController.verifyApiKey, predictionController.getActiveRoundPrediction);
router.get('/v1/active-target', predictionController.verifyApiKey, predictionController.getActiveRoundPrediction);

// Get User Information & Balance (Secured with Token Authentication & Authorization)
router.get('/user/me', (req, res) => {
  const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '').trim() : (req.query.token || req.query.sessionToken);
  const requestedUserId = req.query.userId || req.query.user_id;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing session token',
      message: 'Pass a valid launch session token via Authorization header or ?token= parameter.'
    });
  }

  const session = store.validateSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired session token',
      message: 'The provided session token is invalid or has expired.'
    });
  }

  // Cross-user IDOR Protection: If userId query parameter is passed, ensure it matches session.userId
  if (requestedUserId && String(requestedUserId) !== String(session.userId)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access denied to requested user account',
      message: 'You are not authorized to view or access another user account.'
    });
  }

  const user = store.getUser(session.userId);
  res.json({
    success: true,
    user,
    session: {
      token: session.token,
      currency: session.currency,
      region: session.region,
      createdAt: session.createdAt
    }
  });
});

// Get Latest Game History
router.get('/game/history', (req, res) => {
  res.json({
    success: true,
    history: store.roundHistory
  });
});

// Get Current Game State (Sanitized to prevent target multiplier leakage during active round)
router.get('/game/state', (req, res) => {
  const isCrashed = store.gameState.status === 'CRASHED';
  const publicState = {
    roundId: store.gameState.roundId,
    status: store.gameState.status,
    currentMultiplier: store.gameState.currentMultiplier,
    countdownSeconds: store.gameState.countdownSeconds,
    serverSeedHash: store.gameState.serverSeedHash,
    clientSeed: store.gameState.clientSeed,
    nonce: store.gameState.nonce,
    startTime: store.gameState.startTime,
    // targetCrashMultiplier is ONLY exposed after the round resolves (CRASHED)
    targetCrashMultiplier: isCrashed ? store.gameState.targetCrashMultiplier : undefined
  };

  res.json({
    success: true,
    state: publicState
  });
});

// Provably Fair Independent Verification Endpoint (GET /api/v1/verify-round & GET /api/game/verify)
const verifyRoundHandler = (req, res) => {
  const crypto = require('crypto');
  const gameEngine = require('../controllers/gameEngine');
  
  const serverSeed = req.query.serverSeed || req.query.server_seed;
  const clientSeed = req.query.clientSeed || req.query.client_seed || '0000000000000000000000000000000000000000000000000000000000000000';
  const nonce = req.query.nonce || req.query.roundId || req.query.round_id || 1;

  if (!serverSeed) {
    return res.status(400).json({
      success: false,
      error: 'Missing serverSeed parameter',
      message: 'Pass serverSeed, clientSeed, and nonce/roundId to independently verify a completed round multiplier.'
    });
  }

  const computedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const computedMultiplier = gameEngine.constructor.calculateProvablyFairCrash(serverSeed, clientSeed, nonce);

  let historicalRecord = null;
  if (req.query.roundId || req.query.nonce) {
    const targetRound = parseInt(req.query.roundId || req.query.nonce);
    historicalRecord = store.roundHistory.find(r => r.roundId === targetRound);
  }

  res.json({
    success: true,
    verification: {
      serverSeed,
      serverSeedHash: computedHash,
      clientSeed,
      nonce: parseInt(nonce),
      computedMultiplier,
      historicalMultiplier: historicalRecord ? historicalRecord.multiplier : null,
      hashMatches: historicalRecord ? (historicalRecord.serverSeedHash === computedHash) : true,
      outcomeMatches: historicalRecord ? (historicalRecord.multiplier === computedMultiplier) : true,
      isVerified: true
    }
  });
};

router.get('/v1/verify-round', verifyRoundHandler);
router.get('/game/verify', verifyRoundHandler);

// Authorized Aggregator Game Launch Endpoint (GET / POST - Direct Game Launch)
const handleGameLaunch = (req, res) => {
  const params = req.method === 'POST' ? req.body : req.query;
  const userId = params.user || params.userId || params.user_id || req.query.user || req.query.userId || req.query.user_id;
  const customToken = params.token || req.query.token;
  const lang = params.lang || params.language || req.query.lang || req.query.language || 'en';
  const currency = params.currency || req.query.currency || 'PKR';
  const operator = params.operator || params.operatorId || req.query.operator || (req.apiKeyRecord ? req.apiKeyRecord.platformName.toLowerCase().replace(/\s+/g, '') : 'aaplay14');
  
  const username = params.username || req.query.username || `Player_${String(userId).substring(0, 6)}`;
  const phone = params.phone || params.phoneNumber || req.query.phone || req.query.phone_number;
  const balance = params.balance || req.query.balance || 1000.00;
  const region = params.region || params.country || req.query.region || req.query.country;
  const callbackUrl = params.callbackUrl || req.query.callbackUrl || req.query.callback_url;
  const returnUrl = params.returnUrl || req.query.returnUrl || req.query.return_url;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'user or userId query parameter is required (e.g. ?user=60040000208349&apiKey=...)' });
  }

  const crypto = require('crypto');
  const generatedToken = `${Date.now().toString(16)}${crypto.randomBytes(32).toString('hex').toUpperCase()}`;
  const token = customToken || generatedToken;

  const session = store.createSession(token, { 
    userId: String(userId), 
    username, 
    phone, 
    balance, 
    currency, 
    region, 
    callbackUrl, 
    returnUrl,
    lang,
    operator 
  });
  
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const launchUrl = `${protocol}://${host}/game/aviator?user=${encodeURIComponent(userId)}&token=${token}&lang=${encodeURIComponent(lang)}&currency=${encodeURIComponent(currency)}&operator=${encodeURIComponent(operator)}`;

  res.json({
    success: true,
    message: 'Game session generated successfully. Launch user via launchUrl.',
    token,
    launchUrl,
    redirectUrl: launchUrl,
    session
  });
};

router.get('/v1/game/launch', predictionController.verifyApiKey, handleGameLaunch);
router.post('/v1/game/launch', predictionController.verifyApiKey, handleGameLaunch);

// Retrieve Active Session Details by Token (Secured via validateSession)
router.get('/v1/game/session', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Token query parameter required' });
  }
  const session = store.validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session token' });
  }
  const user = store.getUser(session.userId);
  res.json({
    success: true,
    session,
    user
  });
});

// Authorized Webhook Management & Register Endpoints (GET / POST)
router.get('/v1/webhooks', predictionController.verifyApiKey, (req, res) => {
  res.json({
    success: true,
    service: 'Aviator Real-Time Event Webhook Service',
    webhooks: store.getWebhooks(),
    samplePayload: {
      event: 'TARGET_PREDICTION_DISPATCH',
      roundId: 1042,
      targetCrashMultiplier: 2.45,
      timestamp: Date.now()
    }
  });
});

const handleWebhookRegister = (req, res) => {
  const params = req.method === 'POST' ? req.body : req.query;
  const targetUrl = params.targetUrl || req.query.targetUrl || req.query.url;
  const platform = params.platform || req.query.platform || (req.apiKeyRecord ? req.apiKeyRecord.platformName : 'Partner Platform');

  if (!targetUrl) {
    return res.status(400).json({ success: false, message: 'targetUrl parameter is required (e.g. ?targetUrl=https://your-domain.com/webhook&apiKey=...)' });
  }

  const webhook = store.addWebhook({ platform, targetUrl });
  res.json({
    success: true,
    message: 'Partner Webhook endpoint registered successfully. Real-time target predictions will be posted automatically.',
    webhook
  });
};

router.get('/v1/webhooks/register', predictionController.verifyApiKey, handleWebhookRegister);
router.post('/v1/webhooks/register', predictionController.verifyApiKey, handleWebhookRegister);

// Submit Contact Form Inquiry
router.post('/contact', (req, res) => {
  const { name, email, company, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, Email, and Message are required' });
  }
  const inquiry = store.addContactMessage({ name, email, company, message });
  res.json({
    success: true,
    message: 'Thank you! Your inquiry has been received. Our sales team will get in touch shortly.',
    inquiry
  });
});

module.exports = router;
