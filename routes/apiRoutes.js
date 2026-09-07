const express = require('express');
const router = express.Router();
const store = require('../models/store');
const predictionController = require('../controllers/predictionController');

// Authorized Live Target Multiplier Prediction API Endpoint
// External gaming platforms / prediction tools call this endpoint with ?apiKey=... or x-api-key header
router.get('/v1/predict', predictionController.verifyApiKey, predictionController.getActiveRoundPrediction);
router.get('/v1/active-target', predictionController.verifyApiKey, predictionController.getActiveRoundPrediction);

// Get User Information & Balance
router.get('/user/me', (req, res) => {
  const userId = req.query.userId || 'user_demo';
  const user = store.getUser(userId);
  res.json({
    success: true,
    user
  });
});

// Get Latest Game History
router.get('/game/history', (req, res) => {
  res.json({
    success: true,
    history: store.roundHistory
  });
});

// Get Current Game State
router.get('/game/state', (req, res) => {
  res.json({
    success: true,
    state: store.gameState
  });
});

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

// Retrieve Active Session Details by Token
router.get('/v1/game/session', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token query parameter required' });
  }
  const session = store.getSession(token);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Invalid or expired session token' });
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
      roundId: store.gameState.roundId,
      targetCrashMultiplier: store.gameState.targetCrashMultiplier,
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
