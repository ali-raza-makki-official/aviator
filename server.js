const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config/game-config');
const store = require('./models/store');
const gameEngine = require('./controllers/gameEngine');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent browser from caching old memory state or static frontend responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Static options to prevent browser from caching old frontend bundles or memory state
const noCacheStaticOpts = {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
};

// Serve static frontend files from 'public' folder & asset aliases (index: false so / serves home.html)
app.use(express.static(path.join(__dirname, 'public'), { ...noCacheStaticOpts, index: false }));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts'), noCacheStaticOpts));
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), noCacheStaticOpts));
app.use('/images', express.static(path.join(__dirname, 'public/images'), noCacheStaticOpts));
app.use('/images/aviator-next.spribegaming.com/assets', express.static(path.join(__dirname, 'public/assets'), noCacheStaticOpts));
app.use('/fonts/aviator-next.spribegaming.com', express.static(path.join(__dirname, 'public/fonts'), noCacheStaticOpts));

// Favicon 200 OK Handler
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'assets', 'ico', 'favicon.png');
  if (fs.existsSync(faviconPath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(faviconPath);
  }
  res.status(204).end();
});

// Smart Asset Resolver Middleware for fonts, avatars, planes, and canvas SVGs
app.use((req, res, next) => {
  const filename = path.basename(req.path);
  
  if (filename.endsWith('.svg') || filename.endsWith('.png') || filename.endsWith('.ttf') || filename.endsWith('.woff2') || filename.endsWith('.jpg')) {
    const publicDir = path.join(__dirname, 'public');
    let cleanPath = req.path.replace(/^\/images\/aviator-next\.spribegaming\.com/, '');
    cleanPath = cleanPath.replace(/^\/fonts\/aviator-next\.spribegaming\.com/, '');

    const candidatePaths = [
      path.join(publicDir, req.path),
      path.join(publicDir, cleanPath),
      path.join(publicDir, filename),
      path.join(publicDir, 'images', filename),
      path.join(publicDir, 'fonts', filename),
      path.join(publicDir, 'assets', filename),
      path.join(publicDir, 'assets/images/canvas/bg', filename),
      path.join(publicDir, 'assets/images/canvas/prop', filename),
      path.join(publicDir, 'assets/images/canvas/plane/spribe', filename),
      path.join(publicDir, 'assets/images/canvas/partners-logo', filename),
      path.join(publicDir, 'assets/static/avatars/v2', filename)
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const absPath = path.resolve(candidate);
        if (filename.endsWith('.ttf')) {
          res.setHeader('Content-Type', 'font/ttf');
        } else if (filename.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filename.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        }
        return res.sendFile(absPath);
      }
    }
  }
  next();
});

// Sentry envelope mock endpoint to eliminate ERR_NAME_NOT_RESOLVED in browser console
app.all('*sentry*', (req, res) => res.status(200).send({}));
app.all('*/api/10/envelope*', (req, res) => res.status(200).send({}));

// Configured Allowed Origins
const allowedAdminOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s => s.trim());

const adminCors = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedAdminOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error('CORS blocked: Origin not authorized for Admin operations');
    err.status = 403;
    return callback(err);
  },
  credentials: true
});

// API Routes
app.use('/api', apiRoutes);
app.use('/user/me', (req, res, next) => { req.url = '/user/me' + (req.url === '/' ? '' : req.url); apiRoutes(req, res, next); });
app.use('/api/admin', adminCors, adminRoutes);

// CORS Error Handling Middleware
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Forbidden: Origin not permitted for private endpoint',
      message: err.message
    });
  }
  next(err);
});

// Express HTML Page Routes (Complete React 18 SPA Platform Suite)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/user/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/user/dashbord', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/contect', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
const sendUnauthorizedPage = (res) => {
  return res.status(401).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>401 Unauthorized - Aviator Production Game</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #090d16;
            --bg-card: #131b2e;
            --accent-red: #e50914;
            --accent-gold: #f59e0b;
            --text-main: #ffffff;
            --text-muted: #8e9bb0;
            --border: rgba(255, 255, 255, 0.08);
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', -apple-system, sans-serif;
        }
        body {
            background-color: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .error-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border);
            border-top: 4px solid var(--accent-red);
            border-radius: 20px;
            padding: 48px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(229, 9, 20, 0.12);
            color: var(--accent-red);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 24px;
        }
        .icon {
            font-size: 56px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }
        p {
            color: var(--text-muted);
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 28px;
        }
        .code-box {
            background: rgba(0, 0, 0, 0.35);
            border: 1px dashed var(--border);
            border-radius: 12px;
            padding: 16px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #38bdf8;
            text-align: left;
            margin-bottom: 32px;
            word-break: break-all;
        }
        .btn-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background-color: var(--accent-red);
            color: #fff;
        }
        .btn-secondary {
            background-color: rgba(255, 255, 255, 0.05);
            color: var(--text-main);
            border: 1px solid var(--border);
        }
        .btn-gold {
            background: linear-gradient(135deg, var(--accent-gold), #ff8800);
            color: #000;
        }
    </style>
</head>
<body>
    <div class="error-card">
        <div class="badge">🔒 401 Unauthorized</div>
        <div class="icon">✈️</div>
        <h1>Authentication Required to Access Game</h1>
        <p>Direct browser access to <code>/game/aviator</code> without a valid session token or user authentication parameters is restricted.</p>
        
        <div class="code-box">
            Required Launch Format:<br>
            GET /game/aviator?token=session_xxxx&userId=user_101
        </div>

        <div class="btn-group">
            <a href="/demo/aviator" class="btn btn-primary">🎮 Open Public Demo Game (/demo/aviator)</a>
            <a href="/game/aviator?token=session_demo_guest&userId=user_guest&username=GuestPlayer&balance=1000&currency=PKR" class="btn btn-gold">🔑 Launch with Demo Auth Token</a>
            <a href="/docs" class="btn btn-secondary">📖 View API Integration Documentation</a>
        </div>
    </div>
</body>
</html>
  `);
};

// Authenticated Production Game Launch Route (/game/aviator)
app.get('/game/aviator', (req, res) => {
  const token = req.query.token;
  const user = req.query.user || req.query.userId || req.query.user_id;
  const apiKey = req.query.apiKey || req.query.api_key || req.headers['x-api-key'];
  const isDemo = req.query.demo === 'true' || token === 'session_demo_guest';

  // Demo launch allowance
  if (isDemo) {
    if (!store.sessions.has('session_demo_guest')) {
      store.createSession('session_demo_guest', {
        userId: 'user_guest',
        username: req.query.username || 'GuestPlayer',
        currency: req.query.currency || 'PKR',
        lang: req.query.lang || 'en',
        operator: req.query.operator || 'demo',
        balance: 1000.00
      });
    }
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  // Without token, reject with 401 Unauthorized
  if (!token) {
    return sendUnauthorizedPage(res);
  }

  // Validate session
  let session = store.validateSession(token);

  // If token not found in memory, check if launched via valid operator API key
  if (!session && apiKey) {
    const validKey = store.getApiKey(apiKey);
    if (validKey) {
      session = store.createSession(token, {
        userId: String(user || 'user_' + Date.now()),
        username: req.query.username || `Player_${String(user || 'user').substring(0, 6)}`,
        currency: req.query.currency || 'PKR',
        lang: req.query.lang || 'en',
        operator: validKey.platformName || 'partner',
        balance: parseFloat(req.query.balance) || 1000.00
      });
    }
  }

  if (!session) {
    return sendUnauthorizedPage(res);
  }

  // Cross-user IDOR protection: if user/userId query param passed, it MUST match session.userId
  if (user && String(user) !== String(session.userId)) {
    return res.status(403).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>403 Forbidden - Aviator Game</title>
    <style>
      body { background: #090d16; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: #131b2e; border: 1px solid #ef4444; border-radius: 16px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      h1 { color: #ef4444; font-size: 24px; margin-bottom: 12px; }
      p { color: #8e9bb0; font-size: 14px; line-height: 1.6; }
      a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #e50914; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔒 403 Forbidden</h1>
        <p>Access Denied: The requested userId does not match the authenticated session token owner.</p>
        <a href="/demo/aviator">🎮 Launch Demo Mode</a>
    </div>
</body>
</html>
    `);
  }

  // Authorized launch: serve game UI
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Public Demo Game Routes (100% Public Access - No Token / Auth Required)
app.get('/demo/production', (req, res) => res.sendFile(path.join(__dirname, 'public', 'production.html')));
app.get('/demo/aviator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/demo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Socket.io Real-Time Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);
  
  // Extract and strictly validate session token from query/auth
  const token = (socket.handshake.query && socket.handshake.query.token) || (socket.handshake.auth && socket.handshake.auth.token);
  const isDemoMode = socket.handshake.query && (socket.handshake.query.demo === 'true' || socket.handshake.query.isDemo === 'true');
  
  let userId = null;
  let session = null;

  if (token) {
    session = store.validateSession(token);
    if (session) {
      userId = session.userId;
    }
  }

  // Fallback to isolated demo user only when explicit demo mode is requested or no token for demo game
  if (!userId) {
    userId = 'user_demo';
  }

  // Send Initial Sync Package to Client
  const sendSyncPackage = () => {
    socket.emit('init_sync', {
      user: store.getUser(userId),
      gameState: store.gameState,
      roundHistory: store.roundHistory.slice(0, 100),
      botBets: store.activeBotBets
    });
  };

  sendSyncPackage();

  // Event: Client requests instant resync (e.g. tab regain focus or reconnect)
  socket.on('request_sync', () => {
    sendSyncPackage();
  });

  // Event: User places a bet (bet1 or bet2) - Strictly uses authenticated socket userId
  socket.on('place_bet', async (data) => {
    try {
      const { betSlot = 'bet1', amount, roundId, idempotencyKey } = (data || {});
      const currentUser = store.getUser(userId);

      if (!currentUser) {
        throw new Error("User account not found or not authenticated");
      }

      // Server is sole authority for timing and round validation
      const targetRoundId = roundId !== undefined ? roundId : store.gameState.roundId;
      const result = await store.placeBet(userId, betSlot, amount, targetRoundId, idempotencyKey);

      console.log(`[Bet Placed] User ${currentUser.username} placed $${amount} on ${betSlot} for Round #${targetRoundId} (Duplicate: ${result.duplicate})`);

      socket.emit('bet_response', {
        success: true,
        betSlot,
        amount,
        roundId: targetRoundId,
        balance: result.balance,
        bet: result.bet,
        duplicate: result.duplicate
      });

      // Broadcast bet to admin & players
      io.emit('player_bet_event', {
        userId,
        username: currentUser.username,
        betSlot,
        amount
      });

    } catch (err) {
      socket.emit('bet_response', {
        success: false,
        code: err.code || 'BET_REJECTED',
        message: err.message
      });
    }
  });

  // Event: User Cashout during FLYING state - Strictly uses authenticated socket userId
  socket.on('cashout', async (data) => {
    try {
      const { betSlot = 'bet1', roundId, idempotencyKey } = (data || {});
      const currentUser = store.getUser(userId);

      if (!currentUser) {
        throw new Error("User account not found or not authenticated");
      }

      // Multiplier determined strictly by server; client cannot submit multiplier
      const targetRoundId = roundId !== undefined ? roundId : store.gameState.roundId;
      const result = await store.cashoutBet(userId, betSlot, targetRoundId, idempotencyKey);

      console.log(`[Cashout] User ${currentUser.username} cashed out at ${result.multiplier}x for $${result.winAmount} (Round #${targetRoundId})`);

      socket.emit('cashout_response', {
        success: true,
        betSlot,
        roundId: targetRoundId,
        winAmount: result.winAmount,
        multiplier: result.multiplier,
        balance: result.balance,
        duplicate: result.duplicate
      });

      // Broadcast win to all clients
      io.emit('player_cashout_event', {
        userId,
        username: currentUser.username,
        multiplier: result.multiplier,
        winAmount: result.winAmount
      });

    } catch (err) {
      socket.emit('cashout_response', {
        success: false,
        code: err.code || 'CASHOUT_REJECTED',
        message: err.message
      });
    }
  });

  // Event: Admin real-time socket authentication
  socket.on('admin_connect', (pass) => {
    if (pass === config.ADMIN_SECRET) {
      socket.join('admin_room');
      socket.emit('admin_auth_status', { success: true });
      console.log(`[Admin] Connected to Admin Live Socket Room`);
    } else {
      socket.emit('admin_auth_status', { success: false, message: 'Invalid Admin Password' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Game Engine Loop
gameEngine.init(io);

// Start Express Server
server.listen(config.PORT, () => {
  console.log(`
=====================================================
🚀 Aviator Crash Game Backend is LIVE!
-----------------------------------------------------
🎮 Game UI:       http://localhost:${config.PORT}
🛠️ Admin Control: http://localhost:${config.PORT}/admin.html
🔑 Admin Password: ${config.ADMIN_SECRET}
=====================================================
  `);
});
