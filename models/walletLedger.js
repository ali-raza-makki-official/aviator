const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WalletLedger {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.usersFilePath = path.join(this.dataDir, 'users.json');
    this.ledgerFilePath = path.join(this.dataDir, 'ledger.json');
    this.betsFilePath = path.join(this.dataDir, 'bets.json');

    // In-memory per-user async mutex lock queue to guarantee atomicity & prevent race conditions
    this.userLocks = new Map();

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // In-memory cache synced with persistent storage
    this.users = new Map();
    this.ledger = [];
    this.bets = new Map(); // betId -> betRecord

    this.init();
  }

  // Crash-safe atomic file writing (write to temp file then atomic rename)
  atomicWriteJSON(filePath, data) {
    try {
      const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`[WalletLedger] Error atomically writing ${filePath}:`, err.message);
    }
  }

  // Initialize and recover state from disk
  init() {
    // 1. Load or initialize users.json
    try {
      if (fs.existsSync(this.usersFilePath)) {
        const raw = fs.readFileSync(this.usersFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(u => this.users.set(u.id, u));
        }
      }
    } catch (err) {
      console.error('[WalletLedger] Error loading users.json:', err.message);
    }

    // 2. Load or initialize ledger.json
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        const raw = fs.readFileSync(this.ledgerFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.ledger = parsed;
        }
      }
    } catch (err) {
      console.error('[WalletLedger] Error loading ledger.json:', err.message);
    }

    // 3. Load or initialize bets.json
    try {
      if (fs.existsSync(this.betsFilePath)) {
        const raw = fs.readFileSync(this.betsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(b => this.bets.set(b.betId, b));
        }
      } else {
        this.saveBets();
      }
    } catch (err) {
      console.error('[WalletLedger] Error loading bets.json:', err.message);
    }

    // Ensure default demo user exists persistently
    if (!this.users.has('user_demo')) {
      this.createUser('user_demo', 'Player', 10000, true);
    }

    // Ensure test user exists persistently
    if (!this.users.has('test_user_777')) {
      this.createUser('test_user_777', 'TestIntegrator', 2500, false);
    }

    console.log(`[WalletLedger] Initialized. Users: ${this.users.size}, Ledger Txs: ${this.ledger.length}, Bets: ${this.bets.size}`);
  }

  saveUsers() {
    const list = Array.from(this.users.values());
    this.atomicWriteJSON(this.usersFilePath, list);
  }

  saveLedger() {
    this.atomicWriteJSON(this.ledgerFilePath, this.ledger);
  }

  saveBets() {
    const list = Array.from(this.bets.values());
    this.atomicWriteJSON(this.betsFilePath, list);
  }

  // Acquire per-user lock to execute transactions atomically and prevent race conditions/double spending
  async executeAtomic(userId, actionFn) {
    if (!this.userLocks.has(userId)) {
      this.userLocks.set(userId, Promise.resolve());
    }

    const previousLock = this.userLocks.get(userId);
    let release;
    const nextLock = new Promise(resolve => {
      release = resolve;
    });
    this.userLocks.set(userId, nextLock);

    try {
      await previousLock;
      return await actionFn();
    } finally {
      release();
      if (this.userLocks.get(userId) === nextLock) {
        this.userLocks.delete(userId);
      }
    }
  }

  createUser(id, username, initialBalance = 1000, isDemo = false, extraData = {}) {
    const user = {
      id,
      username: username || `Player_${String(id).substring(0, 5)}`,
      phone: extraData.phone || extraData.phoneNumber || '+923000000000',
      balance: parseFloat(Number(initialBalance).toFixed(2)),
      currency: extraData.currency || 'PKR',
      region: extraData.region || extraData.country || 'PK',
      isDemo,
      totalBet: 0,
      totalWon: 0,
      createdAt: extraData.createdAt || Date.now()
    };

    this.users.set(id, user);
    this.saveUsers();

    // If initialBalance > 0, record initial deposit transaction
    if (user.balance > 0) {
      const tx = {
        txId: `tx_init_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId: id,
        type: 'INITIAL_BALANCE',
        amount: user.balance,
        balanceBefore: 0,
        balanceAfter: user.balance,
        referenceId: 'INITIAL_SEED',
        idempotencyKey: `init_${id}`,
        timestamp: Date.now(),
        metadata: { isDemo }
      };
      this.ledger.push(tx);
      this.saveLedger();
    }

    return user;
  }

  getUser(id, autoCreate = false) {
    if (!this.users.has(id)) {
      // Check disk users.json to ensure multi-process consistency
      try {
        if (fs.existsSync(this.usersFilePath)) {
          const raw = fs.readFileSync(this.usersFilePath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const diskUser = parsed.find(u => u.id === id);
            if (diskUser) {
              this.users.set(diskUser.id, diskUser);
              return diskUser;
            }
          }
        }
      } catch (e) {}

      if (autoCreate) {
        return this.createUser(id, `Player_${String(id).substring(0, 5)}`);
      }
      return null;
    }
    return this.users.get(id);
  }

  // Idempotent Transaction Execution
  async recordTransaction(userId, { type, amount, referenceId, idempotencyKey, metadata = {} }) {
    return this.executeAtomic(userId, async () => {
      // 1. Check idempotency if key provided
      if (idempotencyKey) {
        const existingTx = this.ledger.find(t => t.idempotencyKey === idempotencyKey && t.userId === userId);
        if (existingTx) {
          const user = this.getUser(userId);
          return {
            duplicate: true,
            tx: existingTx,
            user,
            balance: user.balance
          };
        }
      }

      const user = this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const numAmount = parseFloat(Number(amount).toFixed(2));
      const balanceBefore = parseFloat(Number(user.balance).toFixed(2));
      const balanceAfter = parseFloat(Number(balanceBefore + numAmount).toFixed(2));

      // Prevent balance from going negative on debits
      if (numAmount < 0 && balanceAfter < 0) {
        throw new Error("Insufficient balance");
      }

      // Update in-memory user
      user.balance = balanceAfter;
      if (numAmount < 0) {
        user.totalBet = parseFloat((user.totalBet + Math.abs(numAmount)).toFixed(2));
      } else if (type === 'CASHOUT') {
        user.totalWon = parseFloat((user.totalWon + numAmount).toFixed(2));
      }

      // Create unique transaction record
      const txId = `tx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const txRecord = {
        txId,
        userId,
        type,
        amount: numAmount,
        balanceBefore,
        balanceAfter,
        referenceId: referenceId || null,
        idempotencyKey: idempotencyKey || null,
        timestamp: Date.now(),
        metadata
      };

      this.ledger.push(txRecord);

      // Persist atomically to disk
      this.saveUsers();
      this.saveLedger();

      return {
        duplicate: false,
        tx: txRecord,
        user,
        balance: user.balance
      };
    });
  }

  // Atomic & Idempotent Bet Placement
  async placeBet(userId, betSlot, amount, roundId, idempotencyKey = null) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("Invalid bet amount");
    }

    const effectiveIdempotencyKey = idempotencyKey || `bet_${roundId}_${userId}_${betSlot}`;

    return this.executeAtomic(userId, async () => {
      // 1. Strict Duplicate Bet Rejection: A bet slot must not silently overwrite an existing active bet
      const existingBet = Array.from(this.bets.values()).find(
        b => b.roundId === roundId && b.userId === userId && b.betSlot === betSlot
      );

      if (existingBet) {
        const err = new Error(`Bet slot '${betSlot}' already has an active bet for round ${roundId}. Duplicate and replacement bets are rejected.`);
        err.code = 'DUPLICATE_BET';
        err.existingBet = existingBet;
        throw err;
      }

      // Check idempotencyKey in ledger as well
      const existingTx = this.ledger.find(t => t.idempotencyKey === effectiveIdempotencyKey && t.userId === userId);
      if (existingTx) {
        const err = new Error(`Duplicate transaction: bet with idempotency key '${effectiveIdempotencyKey}' already processed.`);
        err.code = 'IDEMPOTENCY_DUPLICATE';
        throw err;
      }

      const user = this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (user.balance < numAmount) {
        throw new Error("Insufficient balance");
      }

      const balanceBefore = user.balance;
      const balanceAfter = parseFloat((balanceBefore - numAmount).toFixed(2));
      const betId = `bet_${roundId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const txId = `tx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

      // 1. Prepare record in persistent ledger
      const txRecord = {
        txId,
        userId,
        type: 'BET',
        amount: -numAmount,
        balanceBefore,
        balanceAfter,
        referenceId: betId,
        idempotencyKey: effectiveIdempotencyKey,
        timestamp: Date.now(),
        metadata: { roundId, betSlot }
      };

      // 2. Prepare record in persistent bets table
      const betRecord = {
        betId,
        userId,
        roundId,
        betSlot,
        amount: numAmount,
        cashedOut: false,
        multiplier: 0,
        winAmount: 0,
        txDebitId: txId,
        txCreditId: null,
        timestamp: Date.now()
      };

      // Transactional commit: apply mutations only when ready to persist
      try {
        user.balance = balanceAfter;
        user.totalBet = parseFloat((user.totalBet + numAmount).toFixed(2));
        this.ledger.push(txRecord);
        this.bets.set(betId, betRecord);

        // Atomic write to disk
        this.saveUsers();
        this.saveLedger();
        this.saveBets();
      } catch (writeErr) {
        // Rollback in-memory state and disk if write fails
        user.balance = balanceBefore;
        user.totalBet = parseFloat((user.totalBet - numAmount).toFixed(2));
        const txIndex = this.ledger.indexOf(txRecord);
        if (txIndex !== -1) this.ledger.splice(txIndex, 1);
        this.bets.delete(betId);

        try {
          this.saveUsers();
          this.saveLedger();
        } catch (e) {}

        throw new Error(`Atomic bet creation failed: ${writeErr.message}`);
      }

      return {
        success: true,
        duplicate: false,
        balance: user.balance,
        bet: betRecord
      };
    });
  }

  // Atomic & Idempotent Cashout
  async cashoutBet(userId, betSlot, roundId, currentMultiplier, idempotencyKey = null) {
    const effectiveIdempotencyKey = idempotencyKey || `cashout_${roundId}_${userId}_${betSlot}`;

    return this.executeAtomic(userId, async () => {
      // Locate active bet for this slot and round
      const bet = Array.from(this.bets.values()).find(
        b => b.roundId === roundId && b.userId === userId && b.betSlot === betSlot
      );

      if (!bet) {
        throw new Error("No active bet found for this slot");
      }

      if (bet.cashedOut) {
        const user = this.getUser(userId);
        return {
          duplicate: true,
          balance: user.balance,
          winAmount: bet.winAmount,
          multiplier: bet.multiplier,
          betSlot,
          bet
        };
      }

      const user = this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const mult = parseFloat(Number(currentMultiplier).toFixed(2));
      const winAmount = parseFloat((bet.amount * mult).toFixed(2));

      bet.cashedOut = true;
      bet.multiplier = mult;
      bet.winAmount = winAmount;
      bet.cashedOutAt = Date.now();

      const balanceBefore = user.balance;
      const balanceAfter = parseFloat((balanceBefore + winAmount).toFixed(2));
      user.balance = balanceAfter;
      user.totalWon = parseFloat((user.totalWon + winAmount).toFixed(2));

      const txId = `tx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      bet.txCreditId = txId;

      const txRecord = {
        txId,
        userId,
        type: 'CASHOUT',
        amount: winAmount,
        balanceBefore,
        balanceAfter,
        referenceId: bet.betId,
        idempotencyKey: effectiveIdempotencyKey,
        timestamp: Date.now(),
        metadata: { roundId, betSlot, multiplier: mult }
      };
      this.ledger.push(txRecord);

      this.saveUsers();
      this.saveLedger();
      this.saveBets();

      return {
        duplicate: false,
        balance: user.balance,
        winAmount,
        multiplier: mult,
        betSlot,
        bet
      };
    });
  }

  // Admin Balance Adjustment with Immutable Audit Record
  async adminAdjustBalance(userId, { newBalance, adjustmentAmount, adminId = 'admin', reason = 'Admin Adjustment' }) {
    return this.executeAtomic(userId, async () => {
      const user = this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      let diff = 0;
      if (newBalance !== undefined) {
        const target = parseFloat(parseFloat(newBalance).toFixed(2));
        diff = target - user.balance;
      } else if (adjustmentAmount !== undefined) {
        diff = parseFloat(parseFloat(adjustmentAmount).toFixed(2));
      } else {
        throw new Error("Either newBalance or adjustmentAmount is required");
      }

      const balanceBefore = user.balance;
      const balanceAfter = Math.max(0, parseFloat((balanceBefore + diff).toFixed(2)));
      const actualDiff = parseFloat((balanceAfter - balanceBefore).toFixed(2));

      user.balance = balanceAfter;

      const txId = `tx_audit_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const txRecord = {
        txId,
        userId,
        type: 'ADMIN_ADJUSTMENT',
        amount: actualDiff,
        balanceBefore,
        balanceAfter,
        referenceId: `audit_${Date.now()}`,
        idempotencyKey: null,
        timestamp: Date.now(),
        metadata: {
          adminId,
          reason,
          targetRequested: newBalance !== undefined ? newBalance : adjustmentAmount
        }
      };

      this.ledger.push(txRecord);
      this.saveUsers();
      this.saveLedger();

      return {
        tx: txRecord,
        user,
        balance: user.balance
      };
    });
  }

  getLedger(userId = null) {
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        const raw = fs.readFileSync(this.ledgerFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.ledger = parsed;
        }
      }
    } catch (e) {}

    if (userId) {
      return this.ledger.filter(t => t.userId === userId);
    }
    return this.ledger;
  }

  getBets(userId = null) {
    const list = Array.from(this.bets.values());
    if (userId) {
      return list.filter(b => b.userId === userId);
    }
    return list;
  }
}

module.exports = new WalletLedger();