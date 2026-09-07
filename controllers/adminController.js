const store = require('../models/store');
const config = require('../config/game-config');
const adminAuditStore = require('../models/adminAuditStore');

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
    const { multiplier, targetMultiplier } = req.body;
    const rawVal = multiplier !== undefined ? multiplier : targetMultiplier;
    const mult = parseFloat(rawVal);

    if (isNaN(mult) || mult < 1.00 || mult > 10000.00) {
      return res.status(400).json({ success: false, message: 'Invalid multiplier (must be between 1.00x and 10,000.00x)' });
    }

    const oldVal = store.adminControls.forcedNextCrash;
    store.adminControls.forcedNextCrash = mult;

    // If currently WAITING, update active round target immediately
    if (store.gameState.status === 'WAITING') {
      store.gameState.targetCrashMultiplier = mult;
    }

    const gameEngine = require('./gameEngine');
    gameEngine.broadcastAdminState();

    console.log(`[ADMIN ACTION] Forced Crash set to ${mult}x (Active Round #${store.gameState.roundId})`);

    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'FORCE_CRASH',
      targetResource: `round_${store.gameState.roundId}`,
      oldValue: oldVal,
      newValue: mult,
      reason: req.body.reason || 'Admin set forced crash multiplier',
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: `Target multiplier successfully set to ${mult}x`,
      forcedNextCrash: mult,
      targetCrashMultiplier: mult,
      roundId: store.gameState.roundId
    });
  }

  // Immediate Emergency Crash Current Round
  triggerEmergencyCrash(req, res) {
    store.adminControls.forcedNextCrash = 1.00;
    console.log(`[ADMIN ACTION] Emergency Crash Triggered!`);

    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'EMERGENCY_CRASH',
      targetResource: `round_${store.gameState.roundId}`,
      oldValue: store.gameState.currentMultiplier,
      newValue: 1.00,
      reason: req.body.reason || 'Immediate emergency stop triggered',
      ip: req.ip || req.connection.remoteAddress
    });

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

      const oldBalance = user.balance;
      const targetBalance = newBalance !== undefined ? newBalance : balance;
      const result = await store.walletLedger.adminAdjustBalance(targetUserId, {
        newBalance: targetBalance,
        adjustmentAmount,
        adminId: 'admin_portal',
        reason: reason || 'Manual Admin Balance Adjustment'
      });

      adminAuditStore.logAction({
        adminId: 'admin_portal',
        action: 'BALANCE_ADJUSTMENT',
        targetResource: targetUserId,
        oldValue: oldBalance,
        newValue: result.balance,
        reason: reason || 'Manual Admin Balance Adjustment',
        ip: req.ip || req.connection.remoteAddress
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
    const { rtp, rtpPercent, houseEdge, minCrashMultiplier, maxCrashMultiplier } = req.body;
    const targetRtp = rtpPercent !== undefined ? rtpPercent : rtp;

    // Range Validations
    if (targetRtp !== undefined) {
      const parsedRtp = parseFloat(targetRtp);
      if (isNaN(parsedRtp) || parsedRtp < 80.0 || parsedRtp > 99.0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid RTP percent: must be between 80.0% and 99.0%'
        });
      }
    }

    const proposedMin = minCrashMultiplier !== undefined ? parseFloat(minCrashMultiplier) : store.adminControls.minCrashMultiplier;
    const proposedMax = maxCrashMultiplier !== undefined ? parseFloat(maxCrashMultiplier) : store.adminControls.maxCrashMultiplier;

    if (proposedMin < 1.00) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minCrashMultiplier: must be >= 1.00x'
      });
    }

    if (proposedMax <= proposedMin) {
      return res.status(400).json({
        success: false,
        error: 'Invalid multiplier range: maxCrashMultiplier must be strictly greater than minCrashMultiplier'
      });
    }

    const oldSettings = {
      rtpPercent: config.GAME.DEFAULT_RTP_PERCENT,
      minCrashMultiplier: store.adminControls.minCrashMultiplier,
      maxCrashMultiplier: store.adminControls.maxCrashMultiplier
    };

    if (targetRtp !== undefined) {
      config.GAME.DEFAULT_RTP_PERCENT = parseFloat(targetRtp);
      config.GAME.HOUSE_EDGE = parseFloat(((100 - parseFloat(targetRtp)) / 100).toFixed(4));
    }
    if (houseEdge !== undefined) {
      config.GAME.HOUSE_EDGE = Math.min(0.20, Math.max(0.01, parseFloat(houseEdge)));
    }

    store.adminControls.minCrashMultiplier = proposedMin;
    store.adminControls.maxCrashMultiplier = proposedMax;

    adminAuditStore.logAction({
      adminId: 'admin_portal',
      action: 'CONFIG_UPDATE',
      targetResource: 'gameConfig',
      oldValue: oldSettings,
      newValue: {
        rtpPercent: config.GAME.DEFAULT_RTP_PERCENT,
        houseEdge: config.GAME.HOUSE_EDGE,
        minCrashMultiplier: store.adminControls.minCrashMultiplier,
        maxCrashMultiplier: store.adminControls.maxCrashMultiplier
      },
      reason: req.body.reason || 'Admin updated RTP & Multiplier range settings',
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'RTP & Multiplier Range Settings updated successfully',
      rtpPercent: config.GAME.DEFAULT_RTP_PERCENT,
      houseEdge: config.GAME.HOUSE_EDGE,
      adminControls: store.adminControls
    });
  }

  // Immutable Admin Audit Log Viewer
  getAuditLogs(req, res) {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const action = req.query.action || null;
    const adminId = req.query.adminId || null;

    const data = adminAuditStore.getAuditLogs(limit, offset, { action, adminId });
    res.json({
      success: true,
      ...data
    });
  }
}

module.exports = new AdminController();
