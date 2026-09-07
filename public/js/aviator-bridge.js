/**
 * Aviator Real-Time Socket.io Engine & DOM Canvas Overlay Bridge
 * 100% Authentic Spribe Aviator Visual Renderer & Canvas Engine
 * Note: Sidebar & Bet Control DOM logic now handled by modular component files.
 */
(function() {
    console.log('[Aviator Bridge] Initializing Canvas & Socket.io engine...');

    // Instantly purge stale browser memory & cache storage on page load/reload
    try {
        if (typeof window !== 'undefined') {
            window.localStorage && window.localStorage.clear();
            window.sessionStorage && window.sessionStorage.clear();
            if ('caches' in window) {
                caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
            }
        }
    } catch(e) {}

    const urlParams = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : null;
    const tokenParam = urlParams ? (urlParams.get('token') || '') : '';
    const socket = typeof io !== 'undefined' ? io({ query: { token: tokenParam } }) : null;
    if (!socket) {
        console.warn('[Aviator Bridge] Socket.io client library not available.');
        return;
    }

    window.aviatorSocket = socket;

    // State Variables
    let currentGameState = 'WAITING'; // WAITING, FLYING, CRASHED
    let currentMultiplier = 1.00;
    let targetMultiplier = 1.00;
    let displayMultiplier = 1.00;
    let smoothPlaneX = null;
    let smoothPlaneY = null;
    let userBalance = 30318.57;
    let currencySymbol = 'PKR';
    let roundHistory = [];
    let canvas = null;
    let ctx = null;

    const AVAILABLE_AVATARS = [
        'assets/static/avatars/v2/av-1.png',
        'assets/static/avatars/v2/av-2.png',
        'assets/static/avatars/v2/av-3.png',
        'assets/static/avatars/v2/av-4.png',
        'assets/static/avatars/v2/av-5.png',
        'assets/static/avatars/v2/av-18.png',
        'assets/static/avatars/v2/av-19.png',
        'assets/static/avatars/v2/av-20.png',
        'assets/static/avatars/v2/av-21.png',
        'assets/static/avatars/v2/av-22.png',
        'assets/static/avatars/v2/av-23.png',
        'assets/static/avatars/v2/av-33.png',
        'assets/static/avatars/v2/av-35.png',
        'assets/static/avatars/v2/av-41.png',
        'assets/static/avatars/v2/av-47.png',
        'assets/static/avatars/v2/av-49.png',
        'assets/static/avatars/v2/av-50.png',
        'assets/static/avatars/v2/av-51.png',
        'assets/static/avatars/v2/av-53.png',
        'assets/static/avatars/v2/av-63.png',
        'assets/static/avatars/v2/av-65.png',
        'assets/static/avatars/v2/av-67.png',
        'assets/static/avatars/v2/av-68.png',
        'assets/static/avatars/v2/av-69.png',
        'assets/static/avatars/v2/av-70.png',
        'assets/static/avatars/v2/av-71.png',
        'assets/static/avatars/v2/av-72.png'
    ];

    function getSafeAvatarUrl(rawAvatar, fallbackSeed = 0) {
        if (typeof rawAvatar === 'string' && rawAvatar.trim() !== '') {
            const clean = rawAvatar.trim();
            if (clean.includes('assets/') || clean.includes('/images/') || clean.startsWith('http')) {
                if (!clean.includes('avatar-default')) {
                    return clean;
                }
            } else if (clean.startsWith('av-')) {
                return 'assets/static/avatars/v2/' + clean;
            }
        }
        if (typeof rawAvatar === 'number' && !isNaN(rawAvatar)) {
            const idx = Math.abs(Math.floor(rawAvatar)) % AVAILABLE_AVATARS.length;
            return AVAILABLE_AVATARS[idx];
        }
        const idx = Math.abs(Math.floor(fallbackSeed)) % AVAILABLE_AVATARS.length;
        return AVAILABLE_AVATARS[idx];
    }

    // Preload Authentic Spribe SVG Assets
    const bgSunImg = new Image();
    bgSunImg.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/bg/bg-sun.svg';

    const bgDashedImg = new Image();
    bgDashedImg.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/bg/bg-dashed-line.svg';

    const partnersLogoImg = new Image();
    partnersLogoImg.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/partners-logo/partners-logo.svg';

    const officialBadgeImg = new Image();
    officialBadgeImg.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/partners-logo/official.svg';

    const avatarImgs = [];
    for (let i = 1; i <= 3; i++) {
        const img = new Image();
        img.src = '/images/aviator-next.spribegaming.com/assets/static/avatars/v2/av-' + i + '.png';
        avatarImgs.push(img);
    }

    const planeImages = [];
    let planeFrameIndex = 0;
    let planeFrameTimer = 0;
    for (let i = 0; i < 4; i++) {
        const img = new Image();
        img.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/plane/spribe/plane-' + i + '.svg';
        planeImages.push(img);
    }

    const propImg = new Image();
    propImg.src = '/images/aviator-next.spribegaming.com/assets/images/canvas/prop/prop.svg';

    // Animation & State variables for Sunburst, Countdown & Lerp Glow
    let sunburstAngle = 0;
    let lastFrameTime = Date.now();
    let countdownRemaining = 5;
    let totalCountdown = 5;
    let waitingStartTime = Date.now();

    let currentGlowRgb = { r: 1, g: 169, b: 246 }; // Default Vibrant Blue glow
    let glowOpacity = 0.0; // Glow opacity multiplier for smooth fade in during flight and fade out on crash

    // Crash animation snapshots
    let crashStartTime = 0;
    let lastFlightX = 0;
    let lastFlightY = 0;
    let lastTailX = 0;
    let lastTailY = 0;
    let lastControlX = 0;

    // ----------------------------------------------------
    // Authentic Spribe MP3 Audio Engine (Independent Audio Streams)
    // ----------------------------------------------------
    let soundEnabled = true;

    const bgMusicAudio = new Audio('/sounds/bg_music.mp3');
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.35;

    const takeoffAudio = new Audio('/sounds/sprite_audio.mp3');
    takeoffAudio.volume = 0.85;

    const crashAudio = new Audio('/sounds/sprite_audio.mp3');
    crashAudio.volume = 0.95;

    let isTabActive = !document.hidden;

    function safePlayAudio(audioEl) {
        if (!audioEl || !soundEnabled || !isTabActive || document.hidden) return;
        try {
            const p = audioEl.play();
            if (p !== undefined) {
                p.catch(err => {
                    console.log('[Aviator Audio] Play waiting for click:', err);
                });
            }
        } catch(e) {}
    }

    function ensureBackgroundMusic() {
        if (!soundEnabled || !isTabActive || document.hidden) return;
        if (bgMusicAudio && bgMusicAudio.paused) {
            safePlayAudio(bgMusicAudio);
        }
    }

    function handleTabVisibilityChange() {
        if (document.hidden) {
            isTabActive = false;
            try {
                if (bgMusicAudio) bgMusicAudio.pause();
                if (takeoffAudio) takeoffAudio.pause();
                if (crashAudio) crashAudio.pause();
            } catch(e) {}
        } else {
            isTabActive = true;
            smoothPlaneX = null;
            smoothPlaneY = null;
            lastFrameTime = Date.now();
            fetchAndRenderHistoryImmediate();
            if (socket && socket.connected) {
                socket.emit('request_sync');
            }
            if (soundEnabled) {
                ensureBackgroundMusic();
                if (currentGameState === 'FLYING') {
                    if (crashAudio) { crashAudio.pause(); crashAudio.currentTime = 0; }
                    safePlayAudio(takeoffAudio);
                } else if (currentGameState === 'CRASHED' || currentGameState === 'WAITING') {
                    if (crashAudio && crashAudio.paused && crashAudio.currentTime > 0) {
                        safePlayAudio(crashAudio);
                    }
                }
            }
        }
    }

    document.addEventListener('visibilitychange', handleTabVisibilityChange);
    window.addEventListener('blur', () => {
        isTabActive = false;
        try {
            if (bgMusicAudio) bgMusicAudio.pause();
            if (takeoffAudio) takeoffAudio.pause();
            if (crashAudio) crashAudio.pause();
        } catch(e) {}
    });
    window.addEventListener('focus', () => {
        isTabActive = true;
        if (soundEnabled) {
            ensureBackgroundMusic();
            if (currentGameState === 'FLYING') {
                if (crashAudio) { crashAudio.pause(); crashAudio.currentTime = 0; }
                safePlayAudio(takeoffAudio);
            } else if (currentGameState === 'CRASHED' || currentGameState === 'WAITING') {
                if (crashAudio && crashAudio.paused && crashAudio.currentTime > 0) {
                    safePlayAudio(crashAudio);
                }
            }
        }
    });

    function startEngineSound() {
        try {
            if (crashAudio) {
                crashAudio.pause();
                crashAudio.currentTime = 0;
            }
        } catch(e) {}

        if (!soundEnabled || !isTabActive || document.hidden) return;
        try {
            if (takeoffAudio) {
                takeoffAudio.pause();
                takeoffAudio.currentTime = 15.1;
                safePlayAudio(takeoffAudio);
            }
        } catch(e) {}
    }

    function playCrashSound() {
        if (!soundEnabled || !isTabActive || document.hidden) return;
        try {
            if (takeoffAudio) takeoffAudio.pause();
            if (crashAudio) {
                crashAudio.pause();
                crashAudio.currentTime = 6.04;
                safePlayAudio(crashAudio);
            }
        } catch(e) {}
    }

    function stopEngineSound() {
        try {
            if (takeoffAudio) takeoffAudio.pause();
            if (crashAudio) crashAudio.pause();
        } catch(e) {}
    }

    function playBeepSound() {
        if (!soundEnabled || !isTabActive || document.hidden) return;
        ensureBackgroundMusic();
    }

    function playCashoutSound() {
        if (!soundEnabled || !isTabActive || document.hidden) return;
        try {
            const cashoutAudio = new Audio('/sounds/sprite_audio.mp3');
            cashoutAudio.volume = 0.90;
            cashoutAudio.currentTime = 9.0;
            safePlayAudio(cashoutAudio);
        } catch(e) {}
    }

    window.addEventListener('click', ensureBackgroundMusic);
    window.addEventListener('pointerdown', ensureBackgroundMusic);
    window.addEventListener('touchstart', ensureBackgroundMusic);
    window.addEventListener('keydown', ensureBackgroundMusic);

    function syncWaitingCountdown(totalSec, remainingSec) {
        const total = (typeof totalSec === 'number' && totalSec > 0) ? totalSec : 5;
        const remaining = (typeof remainingSec === 'number' && remainingSec >= 0) ? remainingSec : total;

        totalCountdown = total;
        countdownRemaining = remaining;

        const elapsedMs = (total - remaining) * 1000;
        const expectedStartTime = Date.now() - elapsedMs;

        // Prevent resetting waitingStartTime on every tick to avoid progress bar snapping back to full
        if (!waitingStartTime || Math.abs(waitingStartTime - expectedStartTime) > 800) {
            waitingStartTime = expectedStartTime;
        }
    }

    // Socket Connection & Event Sync
    socket.on('connect', () => {
        console.log('[Aviator Bridge] Connected to backend server socket ID:', socket.id);
    });

    socket.on('init_sync', (data) => {
        console.log('[Aviator Bridge] Initial sync data received:', data);
        purgeStalePreRenderedMemory();
        if (data.user) {
            userBalance = parseFloat(data.user.balance) || 30318.57;
            if (data.user.currency) currencySymbol = data.user.currency;
            updateUIBalance(userBalance);
        }
        if (data.gameState) {
            currentGameState = data.gameState.status || 'WAITING';
            targetMultiplier = data.gameState.currentMultiplier || 1.00;
            currentMultiplier = targetMultiplier;
            displayMultiplier = targetMultiplier;
            if (currentGameState === 'WAITING') {
                smoothPlaneX = null;
                smoothPlaneY = null;
            }
            if (data.gameState.countdownSeconds) {
                syncWaitingCountdown(data.gameState.totalCountdownSeconds || 5, data.gameState.countdownSeconds);
            }
        }
        if (data.roundHistory) {
            roundHistory = data.roundHistory;
            renderHistoryPills(roundHistory);
        }
    });

    socket.on('game_countdown', (data) => {
        syncWaitingCountdown(data.total || 5, data.remaining || 5);
        playBeepSound();
    });

    socket.on('game_state', (state) => {
        currentGameState = state.status;
        if (state.currentMultiplier) {
            targetMultiplier = state.currentMultiplier;
            currentMultiplier = state.currentMultiplier;
        }
        if (currentGameState === 'WAITING') {
            displayMultiplier = 1.00;
            targetMultiplier = 1.00;
            smoothPlaneX = null;
            smoothPlaneY = null;
        }
        if (state.countdownSeconds) {
            syncWaitingCountdown(state.totalCountdownSeconds || 5, state.countdownSeconds);
        }
        if (state.roundHistory) {
            roundHistory = state.roundHistory;
            renderHistoryPills(roundHistory);
        }
    });

    socket.on('multiplier_update', (data) => {
        if (currentGameState !== 'FLYING') {
            startEngineSound();
        }
        currentGameState = 'FLYING';
        targetMultiplier = data.multiplier;
        currentMultiplier = data.multiplier;
    });

    socket.on('player_cashout_event', () => {
        playCashoutSound();
    });

    socket.on('game_crash', (data) => {
        console.log('[Aviator Bridge] Game crashed:', data);
        currentGameState = 'CRASHED';
        targetMultiplier = data.finalMultiplier;
        currentMultiplier = data.finalMultiplier;
        displayMultiplier = data.finalMultiplier;
        crashStartTime = Date.now();
        playCrashSound();
        if (data.roundHistory) {
            roundHistory = data.roundHistory;
            renderHistoryPills(roundHistory);
        }
    });

    socket.on('bet_response', (data) => {
        if (data.success && data.balance !== undefined) {
            userBalance = parseFloat(data.balance);
            updateUIBalance(userBalance);
        }
    });

    socket.on('cashout_response', (data) => {
        if (data.success) {
            userBalance = parseFloat(data.balance);
            updateUIBalance(userBalance);
            showCashoutToast(data.winAmount, data.multiplier);
        }
    });

    // UI Balance Synchronizer
    function updateUIBalance(balance) {
        const numStr = parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const balanceEls = document.querySelectorAll('.balance-amount, .balance, .user-balance, .amount');
        balanceEls.forEach(el => {
            if (el.classList.contains('balance-amount')) {
                el.textContent = numStr;
            } else if (el.classList.contains('user-balance') || el.classList.contains('balance')) {
                el.innerHTML = `<span class="balance-amount">${numStr}</span> <span class="balance-currency">${currencySymbol}</span>`;
            }
        });
        const currencyEls = document.querySelectorAll('.balance-currency, .currency');
        currencyEls.forEach(el => {
            el.textContent = currencySymbol;
        });
    }

    // History Pills Renderer (Stage Board Top History Bar - 100 Round History)
    function renderHistoryPills(history) {
        const historyContainers = document.querySelectorAll('.payouts-block, .payouts-wrapper, .stats-list');
        if (!historyContainers.length) return;

        let historyItems = Array.isArray(history) ? history.slice(0, 100) : [];
        // Ensure sorted descending (newest round first at index 0)
        historyItems.sort((a, b) => {
            const tA = typeof a === 'object' ? (a.timestamp || a.roundId || 0) : 0;
            const tB = typeof b === 'object' ? (b.timestamp || b.roundId || 0) : 0;
            return tB - tA;
        });

        const pillsHtml = historyItems.map(item => {
            const rawVal = typeof item === 'number' ? item : (item.crashMultiplier || item.multiplier || item.crash || 1.00);
            const num = parseFloat(rawVal);
            const mult = isNaN(num) ? '1.00' : num.toFixed(2);
            let color = 'rgb(52, 180, 255)'; // Blue (< 2.0x)
            if (num >= 10.0) {
                color = 'rgb(192, 23, 180)'; // Pink / Magenta (>= 10.0x)
            } else if (num >= 2.0) {
                color = 'rgb(145, 62, 248)'; // Purple (>= 2.0x)
            }
            return `<div appcoloredmultiplier="" class="payout ng-star-inserted" style="color: ${color} !important; background: transparent !important; background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 4px; margin-right: 6px; font-family: Inter, sans-serif !important; font-weight: 600 !important; font-size: 13px !important; letter-spacing: -0.2px; display: inline-block; white-space: nowrap;"> ${mult}x </div>`;
        }).join('');

        historyContainers.forEach(container => {
            container.style.overflowX = 'auto';
            container.style.whiteSpace = 'nowrap';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.innerHTML = pillsHtml;
            container.scrollLeft = 0; // Keep newest multiplier on the left in full view
        });

        setupHistoryDropdownModal(historyItems);
    }

    function setupHistoryDropdownModal(history) {
        const statsWidget = document.querySelector('app-stats-widget, .result-history, .stats');
        if (!statsWidget) return;

        let dropdownBtn = statsWidget.querySelector('.button-block, .dropdown-toggle, .more');
        if (dropdownBtn && !dropdownBtn.dataset.aviatorHistoryHooked) {
            dropdownBtn.dataset.aviatorHistoryHooked = 'true';
            dropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleRoundHistoryModal(history);
            });
        }
    }

    function toggleRoundHistoryModal(history) {
        let modal = document.getElementById('aviatorRoundHistoryModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aviatorRoundHistoryModal';
            modal.className = 'dropdown-menu show';
            modal.style.cssText = 'position: absolute; top: 38px; right: 10px; width: 340px; max-height: 400px; background: #14151b; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.85); z-index: 99999; padding: 14px; overflow-y: auto; font-family: "Inter-Bold", Inter, sans-serif; display: none;';
            document.body.appendChild(modal);
        }

        if (modal.style.display === 'block') {
            modal.style.display = 'none';
            return;
        }

        const pillsHtml = history.slice(0, 100).map(item => {
            const rawVal = typeof item === 'number' ? item : (item.crashMultiplier || item.multiplier || item.crash || 1.00);
            const num = parseFloat(rawVal);
            const mult = isNaN(num) ? '1.00' : num.toFixed(2);
            let color = 'rgb(52, 180, 255)';
            let bgStyle = 'background: rgba(52, 180, 255, 0.12);';
            if (num >= 10.0) {
                color = 'rgb(192, 23, 180)';
                bgStyle = 'background: rgba(192, 23, 180, 0.15);';
            } else if (num >= 2.0) {
                color = 'rgb(145, 62, 248)';
                bgStyle = 'background: rgba(145, 62, 248, 0.15);';
            }
            return `<div appcoloredmultiplier="" class="payout ng-star-inserted" style="color: ${color}; ${bgStyle} border-radius: 12px; padding: 4px 10px; margin: 4px; font-weight: 700; font-size: 13px; display: inline-block;"> ${mult}x </div>`;
        }).join('');

        modal.innerHTML = `
            <div class="wrapper">
                <div class="header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <div class="text" style="color: #fff; font-size: 15px; font-weight: 700;">Round History</div>
                    <div style="cursor: pointer; color: #7f8694; font-size: 18px; font-weight: bold;" onclick="document.getElementById('aviatorRoundHistoryModal').style.display='none'">✕</div>
                </div>
                <div class="payouts-block" style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${pillsHtml}
                </div>
            </div>
        `;
        modal.style.display = 'block';
    }

    // Cashout Toast Notification
    function showCashoutToast(winAmount, multiplier) {
        let toast = document.getElementById('aviatorWinToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'aviatorWinToast';
            toast.style.cssText = 'position: fixed; top: 18%; left: 50%; transform: translate(-50%, -50%); background: rgba(40, 169, 9, 0.95); color: white; padding: 14px 28px; border-radius: 25px; font-size: 18px; font-weight: bold; z-index: 99999; box-shadow: 0 0 20px rgba(40, 169, 9, 0.6); text-align: center; pointer-events: none; transition: opacity 0.4s ease; font-family: "Inter-Bold", Inter, sans-serif;';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `YOU CASHED OUT!<br><span style="font-size: 26px; font-weight: 900;">${parseFloat(multiplier).toFixed(2)}x</span> &nbsp;+${parseFloat(winAmount).toFixed(2)} ${currencySymbol}`;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2800);
    }

    // Inject Custom Styles
    const customStyle = document.createElement('style');
    customStyle.textContent = `
        @font-face {
            font-family: 'Inter-Bold';
            src: url('/fonts/aviator-next.spribegaming.com/Inter-Bold.c146dcab14729d84.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
        }
        .balance-amount, .balance-currency, .user-balance, .balance .amount {
            color: #28a745 !important;
            font-weight: 700 !important;
            font-family: 'Inter-Bold', Inter, sans-serif !important;
        }
        .payout, .payouts-block .payout, .payouts-wrapper .payout, app-stats-widget .payout, .stats-list .payout {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            font-family: Inter, sans-serif !important;
            font-weight: 500 !important;
            font-size: 13px !important;
            letter-spacing: -0.2px !important;
            padding: 0 2px !important;
            margin-right: 8px !important;
            display: inline-block !important;
        }
        .more, .more-btn, .btn-history, app-stats-widget .more, .stats-header .more, .payouts-block .more, .history-header .more, .history-btn, button.more, div.more, app-stats-header .more {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
            font-family: Inter, sans-serif !important;
            font-weight: 500 !important;
            font-size: 12px !important;
            color: #7f8694 !important;
            cursor: pointer !important;
        }
        .stage-canvas {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 10 !important;
            pointer-events: none !important;
        }
        .stage-canvas canvas {
            touch-action: none;
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            cursor: inherit;
            pointer-events: none !important;
        }
        .fun-mode, div.fun-mode {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
    `;
    document.head.appendChild(customStyle);

    // Canvas Engine Mount Helper: Finds active visible container in DOM (mobile or desktop)
    function getVisibleStageWrapper() {
        const candidates = document.querySelectorAll('.stage-board, app-stage-board, app-play-board, .play-board-wrapper, app-game-play');
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden') {
                return el;
            }
        }
        return document.querySelector('.stage-board') || document.querySelector('.play-board-wrapper') || document.querySelector('app-stage-board');
    }

    function ensureCanvas() {
        const wrapper = getVisibleStageWrapper();
        if (!wrapper) return false;

        let stageCanvas = document.querySelector('.stage-canvas');
        if (!stageCanvas) {
            stageCanvas = document.createElement('div');
            stageCanvas.className = 'stage-canvas';
            wrapper.prepend(stageCanvas);
        } else if (stageCanvas.parentElement !== wrapper) {
            wrapper.prepend(stageCanvas);
        }

        let canvasEl = stageCanvas.querySelector('canvas');
        if (!canvasEl) {
            canvasEl = document.createElement('canvas');
            canvasEl.id = 'aviatorCustomCanvas';
            stageCanvas.appendChild(canvasEl);
        }

        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        return true;
    }

    let dpr = 1;
    function resizeCanvas() {
        if (!canvas) return;
        const wrapper = getVisibleStageWrapper() || canvas.parentElement;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        
        const w = Math.max(10, Math.floor(rect.width || wrapper.clientWidth || 300));
        const h = Math.max(10, Math.floor(rect.height || wrapper.clientHeight || 220));
        
        dpr = Math.max(window.devicePixelRatio || 1, 2);

        const pixelW = Math.floor(w * dpr);
        const pixelH = Math.floor(h * dpr);

        if (canvas.width !== pixelW || canvas.height !== pixelH) {
            canvas.width = pixelW;
            canvas.height = pixelH;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
        }
    }

    // Authentic Spribe Sunburst Background Renderer
    function drawSunburstBackground(width, height, isPaused) {
        const now = Date.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;

        // Base dark background
        ctx.fillStyle = '#07080a';
        ctx.fillRect(0, 0, width, height);

        const originX = 0;
        const originY = height;
        const radius = Math.hypot(width, height) * 2.5;
        const rayCount = 64; // Exact Spribe ray count
        const angleStep = (Math.PI * 2) / rayCount;

        if (!isPaused) {
            sunburstAngle += dt * 0.00030;
        }

        ctx.save();
        // High-contrast highlighted rays matching original Spribe Aviator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.048)';

        for (let i = 0; i < rayCount; i += 2) {
            const startAngle = i * angleStep - sunburstAngle;
            const endAngle = (i + 1) * angleStep - sunburstAngle;

            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.arc(originX, originY, radius, -startAngle, -endAngle, true);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    // Main Render Loop (60 FPS)
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        ensureCanvas();

        if (!canvas || !ctx) return;
        resizeCanvas();

        if (currentGameState === 'FLYING') {
            displayMultiplier += (targetMultiplier - displayMultiplier) * 0.14;
        } else {
            displayMultiplier = targetMultiplier;
        }

        drawCanvasState(displayMultiplier, currentGameState);
    }

    function drawCanvasState(multiplier, stateInput) {
        const safeMult = (typeof multiplier === 'number' && !isNaN(multiplier) && multiplier >= 1.0) ? multiplier : (targetMultiplier || 1.00);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const state = (stateInput || 'WAITING').toUpperCase();
        const now = Date.now();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const isPaused = (state === 'WAITING' || state === 'CRASHED');
        drawSunburstBackground(width, height, isPaused);

        // Center Ambient Oval Glow (Smooth fade-in during FLYING, immediate fast fade-out on CRASHED / WAITING)
        const targetOpacity = (state === 'FLYING') ? 1.0 : 0.0;
        glowOpacity += (targetOpacity - glowOpacity) * 0.18;

        if (glowOpacity > 0.01) {
            let targetR = 1, targetG = 169, targetB = 246;
            if (safeMult >= 10.0) {
                targetR = 240; targetG = 30; targetB = 170;
            } else if (safeMult >= 2.0) {
                targetR = 175; targetG = 82; targetB = 255;
            }

            currentGlowRgb.r += (targetR - currentGlowRgb.r) * 0.08;
            currentGlowRgb.g += (targetG - currentGlowRgb.g) * 0.08;
            currentGlowRgb.b += (targetB - currentGlowRgb.b) * 0.08;

            const curR = Math.round(currentGlowRgb.r);
            const curG = Math.round(currentGlowRgb.g);
            const curB = Math.round(currentGlowRgb.b);

            // Fully Responsive Center Oval Ambient Glow (Locked to exact dead center of stage canvas)
            const aspect = width / height;
            const responsiveScaleX = Math.min(2.8, Math.max(1.5, aspect * 1.10));
            const responsiveScaleY = 0.85;

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(responsiveScaleX, responsiveScaleY);

            const glowRadius = Math.min(width / responsiveScaleX, height / responsiveScaleY) * 0.48;
            const ovalGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
            ovalGlow.addColorStop(0.0, `rgba(${curR}, ${curG}, ${curB}, ${(0.58 * glowOpacity).toFixed(3)})`);
            ovalGlow.addColorStop(0.35, `rgba(${curR}, ${curG}, ${curB}, ${(0.30 * glowOpacity).toFixed(3)})`);
            ovalGlow.addColorStop(0.70, `rgba(${curR}, ${curG}, ${curB}, ${(0.09 * glowOpacity).toFixed(3)})`);
            ovalGlow.addColorStop(1.0, `rgba(${curR}, ${curG}, ${curB}, 0.0)`);

            ctx.fillStyle = ovalGlow;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        planeFrameTimer++;
        if (planeFrameTimer % 14 === 0) {
            planeFrameIndex = (planeFrameIndex + 1) % planeImages.length;
        }
        const activePlaneImg = planeImages[planeFrameIndex];
        
        const planeW = 102;
        const planeH = 68;
        const fixedPitch = -Math.PI / 90;

        if (state === 'WAITING') {
            // Compact, authentic scaling for WAITING state UI elements
            const barW = Math.min(180, width * 0.32);
            const barH = 4.5;

            let partnerW = barW;
            let partnerH = 32; // default fallback aspect ratio
            if (partnersLogoImg && partnersLogoImg.complete && partnersLogoImg.naturalWidth > 0) {
                partnerH = partnerW * (partnersLogoImg.naturalHeight / partnersLogoImg.naturalWidth);
            }

            let badgeW = Math.min(84, width * 0.16);
            let badgeH = 18; // default fallback aspect ratio
            if (officialBadgeImg && officialBadgeImg.complete && officialBadgeImg.naturalWidth > 0) {
                badgeH = badgeW * (officialBadgeImg.naturalHeight / officialBadgeImg.naturalWidth);
            }

            const gap = 10;
            const totalGroupH = partnerH + gap + barH + gap + badgeH;
            const groupStartY = (height / 2) - (totalGroupH / 2);

            // 1. Draw Partner / UFC Logo (Top)
            const partnerX = width / 2 - partnerW / 2;
            const partnerY = groupStartY;
            if (partnersLogoImg && partnersLogoImg.complete && partnersLogoImg.naturalWidth > 0) {
                ctx.drawImage(partnersLogoImg, partnerX, partnerY, partnerW, partnerH);
            }

            // 2. Draw Countdown Progress Bar (Middle)
            const barX = width / 2 - barW / 2;
            const barY = partnerY + partnerH + gap;

            const elapsed = (now - waitingStartTime) / 1000;
            const remainingTime = Math.max(0, countdownRemaining - elapsed);
            const remainingPct = Math.min(1.0, Math.max(0.0, remainingTime / (totalCountdown || 5)));

            // Background track (semi-transparent white/gray rounded capsule)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 3);
            else ctx.fillRect(barX, barY, barW, barH);
            ctx.fill();

            // Active Countdown Fill (Red capsule decreasing 100% -> 0%)
            if (remainingPct > 0) {
                ctx.fillStyle = '#ff0d45';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(barX, barY, barW * remainingPct, barH, 3);
                else ctx.fillRect(barX, barY, barW * remainingPct, barH);
                ctx.fill();
            }

            // 3. Draw Official Badge (Bottom)
            const badgeX = width / 2 - badgeW / 2;
            const badgeY = barY + barH + gap;
            if (officialBadgeImg && officialBadgeImg.complete && officialBadgeImg.naturalWidth > 0) {
                ctx.drawImage(officialBadgeImg, badgeX, badgeY, badgeW, badgeH);
            }

            const parkedX = 70;
            const parkedY = height - 30;

            ctx.save();
            ctx.translate(parkedX, parkedY);
            ctx.rotate(fixedPitch);

            if (activePlaneImg && activePlaneImg.complete && activePlaneImg.naturalWidth > 0) {
                ctx.drawImage(activePlaneImg, -planeW / 2, -planeH / 2, planeW, planeH);
            } else {
                ctx.fillStyle = '#e50539';
                ctx.beginPath();
                ctx.ellipse(0, 0, 50, 16, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (state === 'FLYING') {
            const flightRatio = Math.min((multiplier - 1.00) / 2.0, 1.0);
            const easeProgress = 1 - Math.pow(1 - flightRatio, 3);
            
            const startX = 70;
            const endX = width * 0.82;
            const startY = height - 30;
            const midY = height * 0.28;

            // Curved Quadratic Bezier Takeoff Arc ("Collar" curve starting from bottom-left ground, staying low initially, then curving up)
            const t = easeProgress;
            const oneMinusT = 1 - t;

            const p0X = startX;
            const p0Y = startY;

            // Control point stays horizontally forward and low near ground to create initial takeoff run & collar curve
            const p1X = startX + 0.52 * (endX - startX);
            const p1Y = startY + 0.05 * (midY - startY);

            const p2X = endX;
            const p2Y = midY;

            const targetBaseX = (oneMinusT * oneMinusT * p0X) + (2 * oneMinusT * t * p1X) + (t * t * p2X);
            const targetBaseY = (oneMinusT * oneMinusT * p0Y) + (2 * oneMinusT * t * p1Y) + (t * t * p2Y);

            // Up/down floating wave animation ONLY starts after plane reaches top-right cruising corner (easeProgress >= 0.95)
            let waveFactor = 0.0;
            if (easeProgress >= 0.95) {
                const waveProgress = Math.min(1.0, (easeProgress - 0.95) / 0.05);
                waveFactor = Math.pow(waveProgress, 2);
            }

            // Coupled vertical and horizontal floating wave:
            // When plane floats UP (slowWaveY > 0), it moves LEFT along top line.
            // When plane floats DOWN (slowWaveY < 0), it moves RIGHT towards right border.
            const slowWaveY = (Math.sin(now / 1600) * (height * 0.14) + Math.sin(now / 3400) * (height * 0.04)) * waveFactor;
            const slowWaveX = -0.30 * slowWaveY;

            const rawPlaneX = targetBaseX + slowWaveX;
            const rawPlaneY = targetBaseY - slowWaveY;

            if (smoothPlaneX === null || Math.abs(smoothPlaneX - rawPlaneX) > 250) {
                smoothPlaneX = rawPlaneX;
                smoothPlaneY = rawPlaneY;
            } else {
                smoothPlaneX += (rawPlaneX - smoothPlaneX) * 0.15;
                smoothPlaneY += (rawPlaneY - smoothPlaneY) * 0.15;
            }

            const planeX = smoothPlaneX;
            const planeY = smoothPlaneY;

            lastFlightX = planeX;
            lastFlightY = planeY;
            lastTailX = planeX - 42;
            lastTailY = planeY + 28;
            lastControlX = lastTailX * 0.50;

            const currentPitch = fixedPitch;

            const tailX = planeX - 42;
            const tailY = planeY + 28;
            const controlX = tailX * 0.50;
            const controlY = height;

            const redFillGradient = ctx.createLinearGradient(0, tailY, 0, height);
            redFillGradient.addColorStop(0.0, 'rgba(229, 5, 57, 0.80)');
            redFillGradient.addColorStop(0.5, 'rgba(180, 15, 40, 0.45)');
            redFillGradient.addColorStop(1.0, 'rgba(120, 10, 30, 0.15)');

            ctx.fillStyle = redFillGradient;
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.quadraticCurveTo(controlX, controlY, tailX, tailY);
            ctx.lineTo(tailX, height);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ff0d45';
            ctx.lineWidth = 5.0;
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.quadraticCurveTo(controlX, controlY, tailX, tailY);
            ctx.stroke();

            ctx.save();
            ctx.translate(planeX, planeY);
            ctx.rotate(currentPitch);

            if (activePlaneImg && activePlaneImg.complete && activePlaneImg.naturalWidth > 0) {
                ctx.drawImage(activePlaneImg, -planeW / 2, -planeH / 2, planeW, planeH);
            } else {
                ctx.fillStyle = '#e50539';
                ctx.beginPath();
                ctx.ellipse(0, 0, 50, 16, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 76px "Inter-Bold", Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 12;
            ctx.fillText(multiplier.toFixed(2) + 'x', width / 2, height / 2 + 10);
            ctx.shadowBlur = 0;

        } else if (state === 'CRASHED') {
            stopEngineSound();

            const crashElapsed = (now - crashStartTime) / 1000;
            if (crashElapsed < 2.0) {
                const flySpeed = 900;
                const flyX = lastFlightX + crashElapsed * flySpeed;
                const flyY = lastFlightY - crashElapsed * flySpeed * 0.25;

                ctx.save();
                ctx.translate(flyX, flyY);
                ctx.rotate(fixedPitch);

                if (activePlaneImg && activePlaneImg.complete && activePlaneImg.naturalWidth > 0) {
                    ctx.drawImage(activePlaneImg, -planeW / 2, -planeH / 2, planeW, planeH);
                } else {
                    ctx.fillStyle = '#e50539';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 50, 16, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 26px "Inter-Bold", Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FLEW AWAY!', width / 2, height / 2 - 25);

            ctx.fillStyle = '#ff0d45';
            ctx.font = '700 76px "Inter-Bold", Inter, sans-serif';
            ctx.fillText(safeMult.toFixed(2) + 'x', width / 2, height / 2 + 45);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 68px "Inter-Bold", Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(safeMult.toFixed(2) + 'x', width / 2, height / 2 + 10);
        }

        // Draw Live Player Avatars & Count Overlay (renders live in ALL states: WAITING, FLYING, CRASHED)
        drawLivePlayerAvatarsOverlay(width, height);

        ctx.restore();
    }

    const liveAvatarImageCache = {};

    function getCachedAvatarImage(url) {
        if (!url) return null;
        if (!liveAvatarImageCache[url]) {
            const img = new Image();
            img.src = url;
            liveAvatarImageCache[url] = img;
        }
        return liveAvatarImageCache[url];
    }

    function drawLivePlayerAvatarsOverlay(width, height) {
        const rightMargin = width - 20;
        const bottomMargin = height - 25;

        const sidebar = window.aviatorSidebar || window.sidebarComponent || (window.aviatorApp && window.aviatorApp.sidebar);

        let top3AvatarUrls = [];
        if (sidebar && Array.isArray(sidebar.currentRoundBets) && sidebar.currentRoundBets.length > 0) {
            const bets = sidebar.currentRoundBets;
            top3AvatarUrls = bets.slice(0, 3).map((b, idx) => sidebar.getSafeAvatarUrl(b.avatar, idx));
        }

        // Draw 3 overlapping avatar circles in real time (NO text / NO 780 number figure)
        const avatarStartX = rightMargin;

        for (let i = 2; i >= 0; i--) {
            const avUrl = (top3AvatarUrls && top3AvatarUrls[i]) ? top3AvatarUrls[i] : ('assets/static/avatars/v2/av-' + (i + 1) + '.png');
            const avImg = getCachedAvatarImage(avUrl);

            const circleX = avatarStartX - (2 - i) * 16;
            const circleY = bottomMargin;

            if (avImg && avImg.complete && avImg.naturalWidth > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(circleX, circleY, 12, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avImg, circleX - 12, circleY - 12, 24, 24);
                ctx.restore();

                ctx.strokeStyle = '#0d0e12';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(circleX, circleY, 12, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    function fetchAndRenderHistoryImmediate() {
        fetch('/api/game/history')
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data.history) && data.history.length > 0) {
                    roundHistory = data.history;
                    renderHistoryPills(roundHistory);
                }
            })
            .catch(err => console.log('[Aviator History] Immediate fetch waiting for socket...', err));
    }

    function purgeStalePreRenderedMemory() {
        try {
            const pillsContainers = document.querySelectorAll('.pills-content, .payouts-block');
            pillsContainers.forEach(el => { if (el) el.innerHTML = ''; });
        } catch(e) {}
    }

    window.addEventListener('DOMContentLoaded', () => {
        purgeStalePreRenderedMemory();
        ensureCanvas();
        fetchAndRenderHistoryImmediate();
    });

    window.addEventListener('resize', resizeCanvas);

    requestAnimationFrame(renderLoop);

    window.placeAviatorBet = function(amount, autoCashout = 0) {
        const roundId = (window.aviatorState && window.aviatorState.roundId) || null;
        socket.emit('place_bet', { betSlot: 'bet1', amount, roundId, autoCashout });
    };

    window.cashoutAviatorBet = function() {
        const roundId = (window.aviatorState && window.aviatorState.roundId) || null;
        socket.emit('cashout', { betSlot: 'bet1', roundId });
    };
})();
