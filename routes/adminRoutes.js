const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const predictionController = require('../controllers/predictionController');

// Apply Admin Authentication Middleware
router.use(adminController.verifyAdmin);

// Dashboard Overview Data
router.get('/dashboard', adminController.getDashboardData);

// Force Crash Multiplier
router.post('/force-crash', adminController.setForceCrash);

// Trigger Emergency Crash Now
router.post('/emergency-crash', adminController.triggerEmergencyCrash);

// Update User Balance
router.post('/update-balance', adminController.updateUserBalance);

// Update RTP / House Settings
router.post('/update-settings', adminController.updateRtpSettings);

// API Keys & Platform Integrations Management
router.get('/keys', (req, res) => predictionController.listApiKeys(req, res));
router.post('/keys/create', (req, res) => predictionController.createApiKey(req, res));
router.post('/generate-key', (req, res) => predictionController.createApiKey(req, res));

// Contact Submissions / Inquiry Messages
router.get('/contact-messages', (req, res) => {
  const store = require('../models/store');
  res.json({ success: true, messages: store.getContactMessages() });
});

router.post('/contact-messages/:id/read', (req, res) => {
  const store = require('../models/store');
  const msg = store.markContactMessageRead(req.params.id);
  res.json({ success: true, message: msg });
});

router.delete('/contact-messages/:id', (req, res) => {
  const store = require('../models/store');
  store.deleteContactMessage(req.params.id);
  res.json({ success: true, message: 'Message deleted' });
});

// Active Launch Sessions
router.get('/sessions', (req, res) => {
  const store = require('../models/store');
  res.json({ success: true, sessions: Array.from(store.sessions.values()) });
});

module.exports = router;
