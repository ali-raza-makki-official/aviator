const fs = require('fs');
const path = require('path');
const config = require('../config/game-config');

class Store {
  constructor() {
    // History JSON File Path
    this.historyFilePath = path.join(__dirname, '../data/history.json');
    
    // In-memory Users Store
    this.users = new Map();
    
    // Default Demo / Admin User
    this.createUser('user_demo', 'Player', config.GAME.DEFAULT_USER_BALANCE, true);
    
    // Active Round State
    this.gameState = {
      roundId: 1001,
      status: 'WAITING', // 'WAITING' | 'FLYING' | 'CRASHED'
      currentMultiplier: 1.00,
      targetCrashMultiplier: 2.00,
      countdownSeconds: config.GAME.WAIT_DURATION_SEC,
      startTime: null
    };

    // Active Round Bets: userId -> { bet1: { amount, cashedOut, multiplier, winAmount }, bet2: ... }
    this.activeBets = new Map();
    
    // Previous Round History (last 100 rounds persistent JSON)
    this.roundHistory = this.loadHistoryFromJSON();

    // Admin Control Settings
    this.adminControls = {
      mode: 'AUTO', // 'AUTO' | 'FIXED' | 'KILL_ALL'
      forcedNextCrash: null, // If set, next round will crash exactly at this multiplier
      killAllBets: false,    // Instantly crash whenever house risk is high
      minHouseProfitPercent: 10,
      totalHouseBetsAmount: 0,
      totalHousePayoutAmount: 0,
      totalRoundsPlayed: 6,
      minCrashMultiplier: 1.00,
      maxCrashMultiplier: 250.00,
      rangeWeights: {
        low: 40,   // 1.00x - 1.99x (40%)
        med: 35,   // 2.00x - 9.99x (35%)
        high: 15,  // 10.00x - 50.00x (15%)
        ultra: 10  // 50.00x+ (10%)
      }
    };

    // Bots List for Simulated Multiplayer Action
    this.bots = this.generateBotNames();
    this.activeBotBets = [];

    // Aggregator Platform Launch Sessions Map (token -> session)
    this.sessions = new Map();

    // Registered Partner Webhooks
    this.webhooks = [
      {
        id: 'wh_101',
        platform: 'Apex Gaming Systems',
        targetUrl: 'https://casino-aggregator.io/api/aviator-webhook',
        events: ['ROUND_START', 'TARGET_PREDICTION', 'ROUND_CRASH'],
        createdAt: Date.now() - 86400000
      }
    ];

    // Contact Form Inquiries Array
    this.contactMessages = [
      {
        id: 'msg_101',
        name: 'Alex Rivera',
        email: 'alex@casino-aggregator.io',
        company: 'Apex Gaming Systems',
        message: 'Hello, we would like to integrate the Aviator API for our platform of 50k active players.',
        timestamp: Date.now() - 3600000,
        status: 'unread'
      }
    ];
  }

  createUser(id, username, initialBalance = config.GAME.DEFAULT_USER_BALANCE, isDemo = false, extraData = {}) {
    const user = {
      id,
      username: username || `Player_${id.substring(0, 5)}`,
      phone: extraData.phone || extraData.phoneNumber || '+923000000000',
      balance: parseFloat(initialBalance),
      currency: extraData.currency || config.GAME.CURRENCY || 'PKR',
      region: extraData.region || extraData.country || 'PK',
      isDemo,
      totalBet: 0,
      totalWon: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  getUser(id) {
    if (!this.users.has(id)) {
      return this.createUser(id, `Player_${id.substring(0, 5)}`);
    }
    return this.users.get(id);
  }

  updateUserBalance(id, amountChange) {
    const user = this.getUser(id);
    user.balance = Math.max(0, parseFloat((user.balance + amountChange).toFixed(2)));
    return user.balance;
  }

  setUserBalance(id, newBalance) {
    const user = this.getUser(id);
    user.balance = Math.max(0, parseFloat(parseFloat(newBalance).toFixed(2)));
    return user.balance;
  }

  placeBet(userId, betSlot, amount) {
    const user = this.getUser(userId);
    amount = parseFloat(amount);

    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid bet amount");
    }

    if (user.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Deduct Balance
    this.updateUserBalance(userId, -amount);
    user.totalBet += amount;
    this.adminControls.totalHouseBetsAmount += amount;

    if (!this.activeBets.has(userId)) {
      this.activeBets.set(userId, {});
    }

    const userBets = this.activeBets.get(userId);
    userBets[betSlot] = {
      amount,
      cashedOut: false,
      multiplier: 0,
      winAmount: 0,
      timestamp: Date.now()
    };

    return {
      balance: user.balance,
      bet: userBets[betSlot]
    };
  }

  cashoutBet(userId, betSlot, currentMultiplier) {
    const userBets = this.activeBets.get(userId);
    if (!userBets || !userBets[betSlot]) {
      throw new Error("No active bet found for this slot");
    }

    const bet = userBets[betSlot];
    if (bet.cashedOut) {
      throw new Error("Bet already cashed out");
    }

    if (this.gameState.status !== 'FLYING') {
      throw new Error("Game is not flying");
    }

    bet.cashedOut = true;
    bet.multiplier = currentMultiplier;
    bet.winAmount = parseFloat((bet.amount * currentMultiplier).toFixed(2));

    // Credit Winnings
    const user = this.getUser(userId);
    this.updateUserBalance(userId, bet.winAmount);
    user.totalWon += bet.winAmount;
    this.adminControls.totalHousePayoutAmount += bet.winAmount;

    return {
      balance: user.balance,
      winAmount: bet.winAmount,
      multiplier: bet.multiplier,
      betSlot
    };
  }

  loadHistoryFromJSON() {
    try {
      const dataDir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.sort((a, b) => {
            const timeDiff = (b.timestamp || 0) - (a.timestamp || 0);
            if (timeDiff !== 0) return timeDiff;
            return (b.roundId || 0) - (a.roundId || 0);
          });
          return parsed.slice(0, 100);
        }
      }
    } catch (err) {
      console.error('[Store] Error reading history.json:', err.message);
    }

    // Seed 100 realistic initial Aviator round history records (newest first)
    const initial = [];
    const now = Date.now();
    for (let i = 1; i <= 100; i++) {
      const rand = Math.random();
      let m;
      if (rand < 0.45) m = 1.00 + Math.random() * 0.99;
      else if (rand < 0.82) m = 2.00 + Math.random() * 7.99;
      else if (rand < 0.96) m = 10.00 + Math.random() * 39.99;
      else m = 50.00 + Math.random() * 150.00;

      initial.push({
        roundId: 1000 - i,
        multiplier: parseFloat(m.toFixed(2)),
        timestamp: now - (i * 45000)
      });
    }

    try {
      const dataDir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.historyFilePath, JSON.stringify(initial, null, 2), 'utf8');
    } catch (e) {}

    return initial;
  }

  saveHistoryToJSON() {
    try {
      const dataDir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.roundHistory, null, 2), 'utf8');
    } catch (err) {
      console.error('[Store] Failed to write history.json:', err.message);
    }
  }

  addRoundToHistory(multiplier) {
    const record = {
      roundId: this.gameState.roundId,
      multiplier: parseFloat(multiplier.toFixed(2)),
      timestamp: Date.now()
    };
    this.roundHistory.unshift(record);
    this.roundHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (this.roundHistory.length > 100) {
      this.roundHistory = this.roundHistory.slice(0, 100);
    }
    this.saveHistoryToJSON();
    this.adminControls.totalRoundsPlayed++;
    return record;
  }

  generateBotNames() {
    const prefixes = ['a***', 'b***', 'c***', 'd***', 'e***', 'm***', 's***', 'k***', 'v***', 'z***'];
    const validAvatars = [1, 2, 3, 4, 5, 18, 19, 20, 21, 22, 23, 33, 35, 41, 47, 49, 50, 51, 53, 63, 65, 67, 68, 69, 70, 71, 72];
    const bots = [];
    for (let i = 1; i <= 60; i++) {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(100 + Math.random() * 900);
      const avNum = validAvatars[Math.floor(Math.random() * validAvatars.length)];
      bots.push({
        id: `bot_${i}`,
        username: `${p}${num}`,
        avatar: `assets/static/avatars/v2/av-${avNum}.png`
      });
    }
    return bots;
  }

  generateRandomBotBets() {
    this.activeBotBets = [];
    const numBots = Math.floor(25 + Math.random() * 35);
    const shuffled = [...this.bots].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numBots; i++) {
      const bot = shuffled[i];
      const betAmount = [10, 20, 50, 100, 200, 500, 1000][Math.floor(Math.random() * 7)];
      // Target Cashout for bot
      const targetCashout = parseFloat((1.1 + Math.random() * 4.5).toFixed(2));

      this.activeBotBets.push({
        botId: bot.id,
        username: bot.username,
        avatar: bot.avatar,
        amount: betAmount,
        targetCashout,
        cashedOut: false,
        multiplier: 0,
        winAmount: 0
      });
    }

    return this.activeBotBets;
  }

  // Aggregator Launch Session Methods
  createSession(token, sessionData) {
    const session = {
      token,
      userId: sessionData.userId || `user_${Date.now()}`,
      username: sessionData.username || 'Platform User',
      phone: sessionData.phone || sessionData.phoneNumber || '+923000000000',
      balance: parseFloat(sessionData.balance) || 100.00,
      currency: sessionData.currency || 'PKR',
      region: sessionData.region || sessionData.country || 'PK',
      callbackUrl: sessionData.callbackUrl || null,
      returnUrl: sessionData.returnUrl || null,
      createdAt: Date.now()
    };
    this.sessions.set(token, session);
    // Also create/update user in store
    this.createUser(session.userId, session.username, session.balance, false, session);
    return session;
  }

  getSession(token) {
    return this.sessions.get(token);
  }

  // Contact Form Inquiry Methods
  addContactMessage({ name, email, company, message }) {
    const inquiry = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name || 'Anonymous',
      email: email || 'No Email',
      company: company || 'N/A',
      message: message || '',
      timestamp: Date.now(),
      status: 'unread'
    };
    this.contactMessages.unshift(inquiry);
    return inquiry;
  }

  getContactMessages() {
    return this.contactMessages;
  }

  markContactMessageRead(id) {
    const msg = this.contactMessages.find(m => m.id === id);
    if (msg) msg.status = 'read';
    return msg;
  }

  deleteContactMessage(id) {
    this.contactMessages = this.contactMessages.filter(m => m.id !== id);
  }

  // Webhook Registration Methods
  addWebhook({ platform, targetUrl, events }) {
    const record = {
      id: `wh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      platform: platform || 'Partner Platform',
      targetUrl: targetUrl || 'https://api.partner-platform.com/webhook',
      events: events || ['ROUND_START', 'TARGET_PREDICTION', 'ROUND_CRASH'],
      createdAt: Date.now()
    };
    this.webhooks.push(record);
    return record;
  }

  getWebhooks() {
    return this.webhooks;
  }
}

module.exports = new Store();
