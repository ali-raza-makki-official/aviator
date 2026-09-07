const store = require('../models/store');
const config = require('../config/game-config');

class GameEngine {
  constructor() {
    this.io = null;
    this.gameLoopInterval = null;
    this.countdownInterval = null;
    this.startTime = null;
  }

  init(io) {
    this.io = io;
    console.log('[GameEngine] Initializing Aviator Crash Game Engine...');
    this.startWaitingState();
  }

  // Generate target crash multiplier for the round
  calculateCrashMultiplier() {
    // 1. Check if Admin set a Forced Crash Multiplier
    if (store.adminControls.forcedNextCrash !== null && store.adminControls.forcedNextCrash >= 1.00) {
      const forced = parseFloat(store.adminControls.forcedNextCrash.toFixed(2));
      console.log(`[Admin Override] Next round forced crash at: ${forced}x`);
      store.adminControls.forcedNextCrash = null; // Reset after setting
      return forced;
    }

    // 2. Evaluate Admin Configured Range Probabilities
    const rw = store.adminControls.rangeWeights || { low: 40, med: 35, high: 15, ultra: 10 };
    const minMult = store.adminControls.minCrashMultiplier || 1.00;
    const maxMult = store.adminControls.maxCrashMultiplier || 250.00;

    const totalWeight = (rw.low || 0) + (rw.med || 0) + (rw.high || 0) + (rw.ultra || 0);
    const randWeight = Math.random() * (totalWeight > 0 ? totalWeight : 100);

    let target;
    let accum = rw.low || 0;

    if (randWeight < accum) {
      // Range 1: 1.00x - 1.99x
      const minBound = Math.max(minMult, 1.00);
      const maxBound = Math.min(maxMult, 1.99);
      target = minBound + Math.random() * Math.max(0.01, (maxBound - minBound));
    } else {
      accum += (rw.med || 0);
      if (randWeight < accum) {
        // Range 2: 2.00x - 9.99x
        const minBound = Math.max(minMult, 2.00);
        const maxBound = Math.min(maxMult, 9.99);
        target = minBound + Math.random() * Math.max(0.01, (maxBound - minBound));
      } else {
        accum += (rw.high || 0);
        if (randWeight < accum) {
          // Range 3: 10.00x - 50.00x
          const minBound = Math.max(minMult, 10.00);
          const maxBound = Math.min(maxMult, 50.00);
          target = minBound + Math.random() * Math.max(0.01, (maxBound - minBound));
        } else {
          // Range 4: 50.00x+
          const minBound = Math.max(minMult, 50.01);
          const maxBound = Math.max(minBound + 1, maxMult);
          target = minBound + Math.random() * Math.max(0.01, (maxBound - minBound));
        }
      }
    }

    target = Math.min(maxMult, Math.max(minMult, target));
    return parseFloat(target.toFixed(2));
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

    console.log(`[GameEngine] Round #${store.gameState.roundId} WAITING. Target Crash: ${store.gameState.targetCrashMultiplier}x`);

    // Broadcast state to clients
    this.io.emit('game_state', {
      status: 'WAITING',
      roundId: store.gameState.roundId,
      targetCrashMultiplier: store.gameState.targetCrashMultiplier,
      countdownSeconds: store.gameState.countdownSeconds,
      totalCountdownSeconds: config.GAME.WAIT_DURATION_SEC,
      roundHistory: store.roundHistory.slice(0, 100),
      botBets
    });

    // Countdown timer
    let remaining = config.GAME.WAIT_DURATION_SEC;
    this.countdownInterval = setInterval(() => {
      remaining -= 1;
      store.gameState.countdownSeconds = remaining;

      this.io.emit('game_countdown', { remaining, total: config.GAME.WAIT_DURATION_SEC });

      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.startFlyingState();
      }
    }, 1000);
  }

  startFlyingState() {
    store.gameState.status = 'FLYING';
    this.startTime = Date.now();
    store.gameState.startTime = this.startTime;

    const targetMult = store.gameState.targetCrashMultiplier;

    console.log(`[GameEngine] Round #${store.gameState.roundId} FLYING! Target: ${targetMult}x`);

    this.io.emit('game_state', {
      status: 'FLYING',
      roundId: store.gameState.roundId,
      currentMultiplier: 1.00,
      targetCrashMultiplier: store.gameState.targetCrashMultiplier,
      startTime: this.startTime,
      elapsedMs: 0
    });

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

    console.log(`[GameEngine] Round #${store.gameState.roundId} CRASHED at ${finalMultiplier}x`);

    // Add round to history log
    const historyRecord = store.addRoundToHistory(finalMultiplier);

    // Broadcast Crash event
    this.io.emit('game_crash', {
      roundId: store.gameState.roundId,
      finalMultiplier,
      historyRecord,
      roundHistory: store.roundHistory.slice(0, 100)
    });

    // Broadcast Admin Stats update
    this.io.emit('admin_stats_update', {
      adminControls: store.adminControls,
      gameState: store.gameState
    });

    // Pause before next round
    setTimeout(() => {
      store.gameState.roundId++;
      this.startWaitingState();
    }, config.GAME.CRASH_PAUSE_SEC * 1000);
  }
}

module.exports = new GameEngine();
