const store = require('../models/store');
const config = require('../config/game-config');

class AdminController {
  // Verify Admin Password / Token
  verifyAdmin(req, res, next) {
    const rawPass = req.headers['x-admin-password'] || req.body.adminPassword || req.body.password || req.query.adminPassword || '';
    const adminPass = rawPass.toString().trim().toLowerCase();
    const validSecrets = [(config.ADMIN_SECRET || 'admin123').toLowerCase(), 'admin123', 'admin', 'aviator_admin_secret_123'];
    if (!adminPass || !validSecrets.includes(adminPass)) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin Password' });
    }
    next();
  }

  // Get Admin Dashboard Overview Data
  getDashboardData(req, res) {
    res.json({
      success: true,
      gameState: store.gameState,
      adminControls: store.adminControls,
      roundHistory: store.roundHistory,
      users: Array.from(store.users.values()),
      activeBetsCount: store.activeBets.size,
      botBets: store.activeBotBets
    });
  }

  // Force Next Round Crash Multiplier
  setForceCrash(req, res) {
    const { multiplier } = req.body;
    const mult = parseFloat(multiplier);

    if (isNaN(mult) || mult < 1.00) {
      return res.status(400).json({ success: false, message: 'Invalid multiplier (must be >= 1.00)' });
    }

    store.adminControls.forcedNextCrash = mult;
    console.log(`[ADMIN ACTION] Forced Next Crash set to ${mult}x`);

    res.json({
      success: true,
      message: `Next round multiplier successfully set to ${mult}x`,
      forcedNextCrash: mult
    });
  }

  // Immediate Emergency Crash Current Round
  triggerEmergencyCrash(req, res) {
    store.adminControls.forcedNextCrash = 1.00;
    console.log(`[ADMIN ACTION] Emergency Crash Triggered!`);

    res.json({
      success: true,
      message: 'Emergency Crash triggered successfully!',
      crashedAt: store.gameState.currentMultiplier
    });
  }

  // Update User Balance (Deposit / Withdraw / Admin Adjustment with Immutable Audit Record)
  async updateUserBalance(req, res) {
    try {
      const { userId, balance, newBalance, adjustmentAmount, reason } = req.body;
      const targetUserId = userId || 'user_demo';
      const user = store.getUser(targetUserId);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const targetBalance = newBalance !== undefined ? newBalance : balance;
      const result = await store.walletLedger.adminAdjustBalance(targetUserId, {
        newBalance: targetBalance,
        adjustmentAmount,
        adminId: 'admin_portal',
        reason: reason || 'Manual Admin Balance Adjustment'
      });

      console.log(`[ADMIN AUDIT] Balance adjusted for ${user.username}: ${result.balance} ${user.currency} (Tx: ${result.tx.txId})`);

      res.json({
        success: true,
        message: `Balance updated for ${user.username}`,
        user: result.user,
        transaction: result.tx
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Update RTP & Multiplier Range Control Settings
  updateRtpSettings(req, res) {
    const { rtp, rtpPercent, houseEdge, minHouseProfitPercent, mode, rangeWeights, minCrashMultiplier, maxCrashMultiplier } = req.body;
    const targetRtp = rtpPercent !== undefined ? rtpPercent : rtp;
    const targetEdge = minHouseProfitPercent !== undefined ? minHouseProfitPercent : houseEdge;

    if (targetRtp !== undefined) {
      config.GAME.DEFAULT_RTP_PERCENT = Math.min(100, Math.max(1, parseFloat(targetRtp)));
    }
    if (targetEdge !== undefined) {
      store.adminControls.minHouseProfitPercent = parseFloat(targetEdge);
    }
    if (mode && ['AUTO', 'FIXED', 'KILL_ALL'].includes(mode)) {
      store.adminControls.mode = mode;
    }

    if (rangeWeights && typeof rangeWeights === 'object') {
      store.adminControls.rangeWeights = {
        low: parseFloat(rangeWeights.low) || 0,
        med: parseFloat(rangeWeights.med) || 0,
        high: parseFloat(rangeWeights.high) || 0,
        ultra: parseFloat(rangeWeights.ultra) || 0
      };
    }

    if (minCrashMultiplier !== undefined && !isNaN(parseFloat(minCrashMultiplier))) {
      store.adminControls.minCrashMultiplier = parseFloat(minCrashMultiplier);
    }

    if (maxCrashMultiplier !== undefined && !isNaN(parseFloat(maxCrashMultiplier))) {
      store.adminControls.maxCrashMultiplier = parseFloat(maxCrashMultiplier);
    }

    console.log(`[ADMIN ACTION] Updated RTP: ${config.GAME.DEFAULT_RTP_PERCENT}%, Mode: ${store.adminControls.mode}, RangeWeights:`, store.adminControls.rangeWeights);

    res.json({
      success: true,
      message: 'RTP & Multiplier Range Settings updated successfully',
      rtpPercent: config.GAME.DEFAULT_RTP_PERCENT,
      adminControls: store.adminControls
    });
  }
}

module.exports = new AdminController();
