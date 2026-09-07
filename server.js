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

// API Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

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
// Authenticated Production Game Launch Route (/game/aviator)
app.get('/game/aviator', (req, res) => {
  const token = req.query.token;
  const user = req.query.user || req.query.userId || req.query.user_id;
  const phone = req.query.phone || req.query.phone_number;
  const apiKey = req.query.apiKey || req.query.api_key || req.headers['x-api-key'];

  // Check if valid session token or authentication parameters exist
  const hasToken = token && (store.sessions.has(token) || token.length >= 8);
  const hasUserAuth = user || phone || apiKey;

  if (hasToken || hasUserAuth) {
    // If token passed, auto-create/sync session in store
    if (token && !store.sessions.has(token)) {
      store.createSession(token, {
        userId: String(user || '60040000208349'),
        username: req.query.username || `Player_${String(user || '600400').substring(0, 6)}`,
        currency: req.query.currency || 'PKR',
        lang: req.query.lang || 'en',
        operator: req.query.operator || 'aaplay14',
        balance: parseFloat(req.query.balance) || 1000.00
      });
    }
    // Authorized launch: serve game UI
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  // Without authentication: Deny access with 401 Error Page
  res.status(401).send(`
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
            --accent-cyan: #00f0ff;
            --accent-gold: #ffb703;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --border-color: rgba(255, 255, 255, 0.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
        body {
            background-color: var(--bg-dark);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .error-card {
            background: var(--bg-card);
            border: 1px solid rgba(229, 9, 20, 0.4);
            box-shadow: 0 0 40px rgba(229, 9, 20, 0.25);
            border-radius: 16px;
            padding: 2.5rem;
            max-width: 600px;
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.2rem;
        }
        .badge {
            background: rgba(229, 9, 20, 0.15);
            border: 1px solid var(--accent-red);
            color: var(--accent-red);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .icon { font-size: 3.5rem; margin: 4px 0; }
        h1 { font-size: 1.7rem; font-weight: 800; line-height: 1.3; }
        p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; }
        .code-box {
            background: #0b111e;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            width: 100%;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            color: var(--accent-cyan);
            word-break: break-all;
            text-align: left;
        }
        .btn-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            margin-top: 10px;
        }
        .btn {
            padding: 12px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--accent-cyan), #00a8ff);
            color: #000;
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
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
});

// Public Demo Game Routes (100% Public Access - No Token / Auth Required)
app.get('/demo/production', (req, res) => res.sendFile(path.join(__dirname, 'public', 'production.html')));
app.get('/demo/aviator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/demo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Socket.io Real-Time Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);
  
  // Extract token from query if provided via aggregator redirect launch
  const token = socket.handshake.query ? socket.handshake.query.token : null;
  let userId = 'user_demo';
  if (token && store.sessions.has(token)) {
    const session = store.sessions.get(token);
    userId = session.userId;
  }
  let user = store.getUser(userId);

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

  // Event: User places a bet (bet1 or bet2)
  socket.on('place_bet', (data) => {
    try {
      const { betSlot = 'bet1', amount } = data;
      const result = store.placeBet(userId, betSlot, amount);

      console.log(`[Bet Placed] User ${user.username} placed $${amount} on ${betSlot}`);

      socket.emit('bet_response', {
        success: true,
        betSlot,
        amount,
        balance: result.balance
      });

      // Broadcast bet to admin & players
      io.emit('player_bet_event', {
        userId,
        username: user.username,
        betSlot,
        amount
      });

    } catch (err) {
      socket.emit('bet_response', {
        success: false,
        message: err.message
      });
    }
  });

  // Event: User Cashout during FLYING state
  socket.on('cashout', (data) => {
    try {
      const { betSlot = 'bet1' } = data;
      const currentMult = store.gameState.currentMultiplier;

      const result = store.cashoutBet(userId, betSlot, currentMult);

      console.log(`[Cashout] User ${user.username} cashed out at ${result.multiplier}x for $${result.winAmount}`);

      socket.emit('cashout_response', {
        success: true,
        betSlot,
        winAmount: result.winAmount,
        multiplier: result.multiplier,
        balance: result.balance
      });

      // Broadcast win to all clients
      io.emit('player_cashout_event', {
        userId,
        username: user.username,
        multiplier: result.multiplier,
        winAmount: result.winAmount
      });

    } catch (err) {
      socket.emit('cashout_response', {
        success: false,
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
