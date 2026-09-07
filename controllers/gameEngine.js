const store = require('../models/store');
const config = require('../config/game-config');
const crypto = require('crypto');

class GameEngine {
  constructor() {
    this.io = null;
    this.gameLoopInterval = null;
    this.countdownInterval = null;
    this.startTime = null;
    this.currentServerSeed = null;
    this.currentClientSeed = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  init(io) {
    this.io = io;
    console.log('[GameEngine] Initializing Provably Fair Aviator Crash Game Engine...');
    this.startWaitingState();
  }

  // Provably Fair Crash Calculation Function (HMAC-SHA256)
  static calculateProvablyFairCrash(serverSeed, clientSeed, nonce, options = {}) {
    const hmac = crypto.createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest('hex');
    const sub = hmac.substring(0, 13);
    const h = parseInt(sub, 16);
    const e = Math.pow(2, 52);

    // Instant crash probability based on config / options
    const instantCrashChance = options.instantCrashChance !== undefined 
      ? options.instantCrashChance 
      : (config.GAME.INSTANT_CRASH_CHANCE !== undefined ? config.GAME.INSTANT_CRASH_CHANCE : 0.03);

    if (instantCrashChance > 0) {
      const divisor = Math.max(1, Math.round(1 / instantCrashChance));
      if (h % divisor === 0) {
        return 1.00;
      }
    }

    // RTP / House Edge configuration
    const rtpPercent = options.rtpPercent !== undefined
      ? options.rtpPercent
      : (config.GAME.DEFAULT_RTP_PERCENT || 97);
    const rtpFactor = Math.min(0.99, Math.max(0.80, rtpPercent / 100));

    let multiplier = Math.floor((100 * e * rtpFactor) / (e - h)) / 100;
    multiplier = Math.max(1.00, multiplier);
    return parseFloat(multiplier.toFixed(2));
  }

  // Generate target crash multiplier for the round using Provably Fair RNG
  calculateCrashMultiplier() {
    // 1. Check if Admin set a Forced Crash Multiplier
    if (store.adminControls.forcedNextCrash !== null && store.adminControls.forcedNextCrash >= 1.00) {
      const forced = parseFloat(store.adminControls.forcedNextCrash.toFixed(2));
      console.log(`[Admin Override] Next round forced crash at: ${forced}x`);
      store.adminControls.forcedNextCrash = null;
      this.currentServerSeed = crypto.randomBytes(32).toString('hex');
      store.gameState.serverSeedHash = crypto.createHash('sha256').update(this.currentServerSeed).digest('hex');
      store.gameState.clientSeed = this.currentClientSeed;
      store.gameState.nonce = store.gameState.roundId;
      return forced;
    }

    // 2. Cryptographically Secure Provably Fair RNG
    this.currentServerSeed = crypto.randomBytes(32).toString('hex');
    store.gameState.serverSeedHash = crypto.createHash('sha256').update(this.currentServerSeed).digest('hex');
    store.gameState.clientSeed = this.currentClientSeed;
    store.gameState.nonce = store.gameState.roundId;

    const rtpPercent = config.GAME.DEFAULT_RTP_PERCENT || 96;
    const instantCrashChance = config.GAME.INSTANT_CRASH_CHANCE || 0.03;

    const fairMultiplier = GameEngine.calculateProvablyFairCrash(
      this.currentServerSeed,
      store.gameState.clientSeed,
      store.gameState.nonce,
      { rtpPercent, instantCrashChance }
    );

    const minMult = store.adminControls.minCrashMultiplier || 1.00;
    const maxMult = store.adminControls.maxCrashMultiplier || 250.00;

    const clamped = Math.min(maxMult, Math.max(minMult, fairMultiplier));
    return parseFloat(clamped.toFixed(2));
  }

  startWaitingState() {
    store.gameState.status = 'WAITING';
    store.gameState.currentMultiplier = 1.00;
    store.gameState.countdownSeconds = config.GAME.WAIT_DURATION_SEC;
    store.gameState.targetCrashMultiplier = this.calculateCrashMultiplier();
    
    // Clear active bets from previous round
    store.activeBets.clear();

    // Generate fresh bot bets for the new round
    const botBets = store.generateRandomBotBets();

    console.log(`[GameEngine] Round #${store.gameState.roundId} WAITING. Target: ${store.gameState.targetCrashMultiplier}x, Commitment Hash: ${store.gameState.serverSeedHash.substring(0, 16)}...`);

    // Broadcast state to public clients (WITHOUT targetCrashMultiplier or serverSeed)
    this.io.emit('game_state', {
      status: 'WAITING',
      roundId: store.gameState.roundId,
      serverSeedHash: store.gameState.serverSeedHash,
      clientSeed: store.gameState.clientSeed,
      nonce: store.gameState.nonce,
      countdownSeconds: store.gameState.countdownSeconds,
      totalCountdownSeconds: config.GAME.WAIT_DURATION_SEC,
      roundHistory: store.roundHistory.slice(0, 100),
      botBets
    });

    // Real-Time Admin Broadcast: Immediately send new roundId and new targetCrashMultiplier
    this.broadcastAdminState();

    // Countdown timer
    let remaining = config.GAME.WAIT_DURATION_SEC;
    this.countdownInterval = setInterval(() => {
      remaining -= 1;
      store.gameState.countdownSeconds = remaining;

      this.io.emit('game_countdown', { remaining, total: config.GAME.WAIT_DURATION_SEC });
      this.io.to('admin_room').emit('admin_countdown', {
        remaining,
        roundId: store.gameState.roundId,
        targetCrashMultiplier: store.gameState.targetCrashMultiplier
      });

      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.startFlyingState();
      }
    }, 1000);
  }

  broadcastAdminState() {
    if (!this.io) return;
    const adminPayload = {
      roundId: store.gameState.roundId,
      status: store.gameState.status,
      targetCrashMultiplier: store.gameState.targetCrashMultiplier,
      currentMultiplier: store.gameState.currentMultiplier,
      countdownSeconds: store.gameState.countdownSeconds,
      serverSeedHash: store.gameState.serverSeedHash,
      clientSeed: store.gameState.clientSeed,
      nonce: store.gameState.nonce,
      adminControls: store.adminControls,
      activeBetsCount: store.activeBets ? store.activeBets.size : 0,
      timestamp: Date.now()
    };
    this.io.to('admin_room').emit('admin_game_state', adminPayload);
    this.io.to('admin_room').emit('admin_stats_update', {
      adminControls: store.adminControls,
      gameState: store.gameState
    });
  }

  startFlyingState() {
    store.gameState.status = 'FLYING';
    this.startTime = Date.now();
    store.gameState.startTime = this.startTime;

    console.log(`[GameEngine] Round #${store.gameState.roundId} FLYING! Hash: ${store.gameState.serverSeedHash.substring(0, 16)}...`);

    // Broadcast state to public clients (WITHOUT targetCrashMultiplier or serverSeed)
    this.io.emit('game_state', {
      status: 'FLYING',
      roundId: store.gameState.roundId,
      currentMultiplier: 1.00,
      serverSeedHash: store.gameState.serverSeedHash,
      clientSeed: store.gameState.clientSeed,
      nonce: store.gameState.nonce,
      startTime: this.startTime,
      elapsedMs: 0
    });

    // Real-Time Admin Broadcast during flight
    this.broadcastAdminState();

    // Main Game Tick Loop (60ms interval)
    this.gameLoopInterval = setInterval(() => {
      const elapsedMs = Date.now() - this.startTime;
      const elapsedSec = elapsedMs / 1000;

      // Exponential Multiplier Growth Formula
      // M(t) = 1.00 + 0.06 * (t ^ 1.45)
      let currentMult = 1.00 + (0.06 * Math.pow(elapsedSec, 1.45));
      currentMult = parseFloat(currentMult.toFixed(2));

      store.gameState.currentMultiplier = currentMult;

      // Check if Admin triggered immediate Crash Now
      const emergencyCrash = (store.adminControls.forcedNextCrash === 1.00);

      // Check if target crash reached or emergency crash triggered
      if (currentMult >= store.gameState.targetCrashMultiplier || emergencyCrash) {
        if (emergencyCrash) {
          store.adminControls.forcedNextCrash = null;
        }
        this.startCrashedState(store.gameState.targetCrashMultiplier);
        return;
      }

      // Check & process Bot cashouts during flight
      store.activeBotBets.forEach(bot => {
        if (!bot.cashedOut && currentMult >= bot.targetCashout && currentMult < store.gameState.targetCrashMultiplier) {
          bot.cashedOut = true;
          bot.multiplier = currentMult;
          bot.winAmount = parseFloat((bot.amount * currentMult).toFixed(2));
          this.io.emit('bot_cashout', bot);
        }
      });

      // Broadcast live multiplier tick to all connected UI clients
      this.io.emit('multiplier_update', {
        multiplier: currentMult,
        roundId: store.gameState.roundId,
        startTime: this.startTime,
        elapsedMs
      });

    }, config.GAME.TICK_INTERVAL_MS);
  }

  startCrashedState(finalMultiplier) {
    clearInterval(this.gameLoopInterval);
    store.gameState.status = 'CRASHED';
    store.gameState.currentMultiplier = finalMultiplier;

    console.log(`[GameEngine] Round #${store.gameState.roundId} CRASHED at ${finalMultiplier}x. Server Seed Revealed: ${this.currentServerSeed}`);

    // Add round to history log along with revealed serverSeed and commitment data
    const historyRecord = store.addRoundToHistory(
      finalMultiplier,
      this.currentServerSeed,
      store.gameState.serverSeedHash,
      store.gameState.clientSeed,
      store.gameState.nonce
    );

    // Broadcast Crash event with revealed serverSeed
    this.io.emit('game_crash', {
      roundId: store.gameState.roundId,
      finalMultiplier,
      serverSeed: this.currentServerSeed,
      serverSeedHash: store.gameState.serverSeedHash,
      clientSeed: store.gameState.clientSeed,
      nonce: store.gameState.nonce,
      historyRecord,
      roundHistory: store.roundHistory.slice(0, 100)
    });

    // Broadcast Admin Stats update to admin room
    this.broadcastAdminState();

    // Pause before next round
    setTimeout(() => {
      store.gameState.roundId++;
      this.startWaitingState();
    }, config.GAME.CRASH_PAUSE_SEC * 1000);
  }
}

module.exports = new GameEngine();
