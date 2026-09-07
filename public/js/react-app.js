/**
 * Aviator Platform Suite - SaaS Web Portal Architecture
 * Location: public/js/react-app.js
 * 100% Component-Driven React 18 Application Bundle
 */

(function() {
    const { useState, useEffect, useMemo, createElement: h } = React;

    // Toast Notification Component
    function Toast({ toast }) {
        if (!toast) return null;
        const isError = toast.type === 'error';
        return h('div', {
            style: {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 10000,
                background: '#131b2e',
                border: `1px solid ${isError ? '#e50914' : '#00f0ff'}`,
                color: '#f8fafc',
                padding: '14px 24px',
                borderRadius: '12px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'Outfit, sans-serif',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }
        }, [
            h('span', { key: 'icon', style: { fontSize: '1.2rem' } }, isError ? '❌' : '✅'),
            h('span', { key: 'msg', style: { fontWeight: '600' } }, toast.message)
        ]);
    }

    // Header Component (Glassmorphism SaaS Navigation Bar)
    function Header({ activeRoute, setActiveRoute, isConnected, adminSecret, setAdminSecret }) {
        return h('header', {
            style: {
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.85rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 1000
            }
        }, [
            // Brand Logo
            h('div', { 
                key: 'logo', 
                style: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }, 
                onClick: () => setActiveRoute('home') 
            }, [
                h('div', { 
                    key: 'icon', 
                    style: { 
                        width: '42px', 
                        height: '42px', 
                        background: 'linear-gradient(135deg, #e50914, #ff4757)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: '800', 
                        fontSize: '1.3rem', 
                        color: '#fff', 
                        boxShadow: '0 0 20px rgba(229, 9, 20, 0.4)' 
                    } 
                }, '✈'),
                h('div', { key: 'text' }, [
                    h('h1', { key: 'h1', style: { fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '-0.3px' } }, 'AVIATOR PRO'),
                    h('span', { key: 'sub', style: { fontSize: '0.68rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '1.8px', fontWeight: '700', display: 'block', marginTop: '-2px' } }, 'SaaS ENGINE & PREDICTOR')
                ])
            ]),

            // SaaS Nav Tabs (Public Facing Only: Home, API Docs, Contact)
            h('nav', { key: 'nav', style: { display: 'flex', alignItems: 'center', gap: '0.5rem' } }, [
                h('button', { key: 'home', className: `nav-btn ${activeRoute === 'home' ? 'active' : ''}`, onClick: () => setActiveRoute('home') }, '🏠 Home'),
                h('button', { key: 'docs', className: `nav-btn ${activeRoute === 'docs' ? 'active' : ''}`, onClick: () => setActiveRoute('docs') }, '📖 API Docs'),
                h('button', { key: 'contact', className: `nav-btn ${activeRoute === 'contact' ? 'active' : ''}`, onClick: () => setActiveRoute('contact') }, '📬 Contact')
            ]),

            // User Actions & Status Badges
            h('div', { key: 'actions', style: { display: 'flex', alignItems: 'center', gap: '1rem' } }, [
                h('div', { key: 'status', style: { display: 'flex', alignItems: 'center', gap: '8px', background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(229, 9, 20, 0.12)', border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(229, 9, 20, 0.3)'}`, color: isConnected ? '#10b981' : '#ef4444', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' } }, [
                    h('div', { key: 'dot', style: { width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 10px #10b981' : '0 0 10px #ef4444' } }),
                    isConnected ? '60ms Engine Active' : 'Offline'
                ]),

                h('a', { key: 'demo', href: '/demo/aviator', target: '_blank', rel: 'noopener noreferrer', className: 'btn-demo-link', style: { background: 'linear-gradient(135deg, #e50914, #ff4757)', color: '#fff', padding: '8px 18px', borderRadius: '10px', fontWeight: '800', textDecoration: 'none', fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)', border: '1px solid #ff4757' } }, '🎮 Launch Demo')
            ])
        ]);
    }

    // Home Page Component (Enterprise SaaS Portal Hero & Features)
    function HomePage({ setActiveRoute, targetMultiplier }) {
        const [copiedCode, setCopiedCode] = useState(false);

        const sampleCode = `// Fetch Live Aviator Target Multiplier
fetch('http://localhost:3000/api/v1/predict')
  .then(res => res.json())
  .then(data => console.log('Target Multiplier:', data.targetCrashMultiplier));`;

        const handleCopyCode = () => {
            navigator.clipboard.writeText(sampleCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 3000);
        };

        return h('div', { style: { padding: '3rem 2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' } }, [
            // SaaS Hero Section
            h('div', { key: 'hero', style: { background: 'radial-gradient(ellipse at top, #1a080a 0%, #0a0d14 100%)', border: '1px solid rgba(229, 9, 20, 0.25)', borderRadius: '24px', padding: '4rem 3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', position: 'relative', overflow: 'hidden' } }, [
                h('div', { key: 'badge', style: { background: 'rgba(229, 9, 20, 0.12)', border: '1px solid rgba(229, 9, 20, 0.35)', color: '#ff4757', padding: '6px 20px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' } }, '🚀 ENTERPRISE CRASH GAME ENGINE & API AGGREGATOR'),
                h('h1', { key: 'h1', style: { fontSize: '3.2rem', fontWeight: '800', margin: 0, color: '#f8fafc', lineHeight: '1.15', letterSpacing: '-0.5px' } }, 'Real-Time Target Prediction & Multiplier Engine'),
                h('p', { key: 'p', style: { color: '#94a3b8', maxWidth: '800px', fontSize: '1.15rem', lineHeight: '1.7' } }, 'High-performance Aviator platform suite engineered with 60ms Socket.io WebSocket synchronization, Provably Fair HMAC-SHA256 RNG, customizable multiplier range probability weights, and 100% GET REST APIs.'),
                
                // Hero CTA Buttons (Public Facing)
                h('div', { key: 'btns', style: { display: 'flex', gap: '1.2rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' } }, [
                    h('a', { key: 'demo', href: '/demo/aviator', target: '_blank', rel: 'noopener noreferrer', style: { background: 'linear-gradient(135deg, #e50914, #ff4757)', color: '#fff', padding: '16px 36px', borderRadius: '12px', fontWeight: '800', textDecoration: 'none', fontSize: '1.05rem', boxShadow: '0 6px 25px rgba(229, 9, 20, 0.4)', transition: 'transform 0.2s ease', border: '1px solid #ff4757' } }, '🎮 Open Public Demo Game (New Tab ↗)'),
                    h('button', { key: 'docs', onClick: () => setActiveRoute('docs'), style: { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', padding: '16px 36px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '1.05rem' } }, '📖 REST API Documentation'),
                    h('button', { key: 'contact', onClick: () => setActiveRoute('contact'), style: { background: 'linear-gradient(135deg, #e50914, #b30006)', color: '#fff', border: 'none', padding: '16px 36px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '1.05rem', boxShadow: '0 6px 25px rgba(229, 9, 20, 0.35)' } }, '📬 Contact Sales Team')
                ])
            ]),

            // Key Metrics & Platform Capabilities
            h('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem' } }, [
                h('div', { key: 'card1', className: 'feature-card' }, [
                    h('div', { key: 'i', style: { fontSize: '2.5rem', marginBottom: '12px' } }, '⚡'),
                    h('h3', { key: 'h', style: { fontSize: '1.35rem', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' } }, '60ms Tick Engine'),
                    h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '0.98rem', lineHeight: '1.6' } }, 'Smooth exponential multiplier growth curve calculated with 60ms interval event-driven WebSocket ticks for zero latency.')
                ]),

                h('div', { key: 'card2', className: 'feature-card' }, [
                    h('div', { key: 'i', style: { fontSize: '2.5rem', marginBottom: '12px' } }, '🎯'),
                    h('h3', { key: 'h', style: { fontSize: '1.35rem', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' } }, 'Custom Range Probabilities'),
                    h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '0.98rem', lineHeight: '1.6' } }, 'Admin customizable percentage weights for 1.00-1.99x, 2.00-9.99x, 10.00-50.00x, and 50.00x+ crash target tiers.')
                ]),

                h('div', { key: 'card3', className: 'feature-card' }, [
                    h('div', { key: 'i', style: { fontSize: '2.5rem', marginBottom: '12px' } }, '🔑'),
                    h('h3', { key: 'h', style: { fontSize: '1.35rem', fontWeight: '800', marginBottom: '10px', color: '#f8fafc' } }, '1-Click Merchant Integration'),
                    h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '0.98rem', lineHeight: '1.6' } }, 'Generates formatted integration specs with API key, live prediction endpoint, and launch URLs to send to partners in 1 click.')
                ])
            ]),

            // Interactive Code Snippet Preview Box
            h('div', { key: 'code-widget', style: { background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' } }, [
                h('div', { key: 'hdr', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                    h('div', { key: 't', style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
                        h('span', { key: 'dot1', style: { width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' } }),
                        h('span', { key: 'dot2', style: { width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' } }),
                        h('span', { key: 'dot3', style: { width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' } }),
                        h('span', { key: 'title', style: { color: '#94a3b8', fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', marginLeft: '10px' } }, 'GET /api/v1/predict')
                    ]),
                    h('button', { key: 'copy', onClick: handleCopyCode, style: { background: copiedCode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)', border: `1px solid ${copiedCode ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`, color: copiedCode ? '#10b981' : '#f8fafc', padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' } }, copiedCode ? '✅ Copied!' : '📋 Copy Code Snippet')
                ]),
                h('pre', { key: 'pre', style: { background: '#060911', padding: '1.2rem', borderRadius: '12px', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem', margin: 0, overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.05)' } }, sampleCode)
            ])
        ]);
    }

    // Admin Page Component (Operator Dashboard with 3 Clean SaaS Tabs & Password Lock)
    function AdminPage({ adminSecret, setAdminSecret, showToast, targetMultiplier, gameState, activeBets, activeSessions, fetchActiveSessions, contactMessages, fetchContactMessages, apiKeys, fetchApiKeys }) {
        const [isAuthorized, setIsAuthorized] = useState(() => {
            return sessionStorage.getItem('aviator_admin_unlocked') === 'true';
        });
        const [inputPass, setInputPass] = useState('');
        const [adminTab, setAdminTab] = useState('live');
        
        // Range weights state
        const [rangeLow, setRangeLow] = useState(40);
        const [rangeMed, setRangeMed] = useState(35);
        const [rangeHigh, setRangeHigh] = useState(15);
        const [rangeUltra, setRangeUltra] = useState(10);
        const [minCrash, setMinCrash] = useState(1.00);
        const [maxCrash, setMaxCrash] = useState(250.00);
        const [forceCrashInput, setForceCrashInput] = useState(5.00);

        // Merchant form state
        const [merchantName, setMerchantName] = useState('');
        const [merchantBalance, setMerchantBalance] = useState('1000');
        const [merchantCurrency, setMerchantCurrency] = useState('PKR');
        const [merchantKey, setMerchantKey] = useState('');
        const [integrationMsg, setIntegrationMsg] = useState('Select or create a merchant key to format message...');

        const handleUnlockAdmin = (e) => {
            e.preventDefault();
            const pass = (inputPass || '').trim().toLowerCase();
            const valid = ['admin123', 'admin', 'aviator_admin_secret_123', (adminSecret || '').toLowerCase()];
            if (valid.includes(pass)) {
                if (typeof setAdminSecret === 'function') {
                    setAdminSecret(inputPass.trim() || 'admin123');
                }
                sessionStorage.setItem('aviator_admin_unlocked', 'true');
                setIsAuthorized(true);
                showToast('🔓 Admin Portal Unlocked Successfully!', 'info');
            } else {
                showToast('❌ Invalid Passcode. Access Denied!', 'error');
            }
        };

        if (!isAuthorized) {
            return h('div', { style: { padding: '5rem 2rem', maxWidth: '520px', margin: '0 auto', textAlign: 'center' } }, [
                h('div', { key: 'card', className: 'feature-card', style: { border: '1px solid rgba(229, 9, 20, 0.4)', padding: '3.5rem 2.5rem', background: '#121622', boxShadow: '0 25px 60px rgba(0,0,0,0.85)' } }, [
                    h('div', { key: 'icon', style: { fontSize: '3.8rem', marginBottom: '1rem' } }, '🔒'),
                    h('h2', { key: 'title', style: { fontSize: '2rem', fontWeight: '800', marginBottom: '0.6rem', color: '#f8fafc' } }, 'Master Operator Lock'),
                    h('p', { key: 'desc', style: { color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' } }, 'Restricted Area. Enter master operator passcode to access live stream, emergency crash, and merchant key generator.'),
                    
                    h('form', { key: 'form', onSubmit: handleUnlockAdmin, style: { display: 'flex', flexDirection: 'column', gap: '1.2rem' } }, [
                        h('div', { key: 'input-wrapper' }, [
                            h('input', { key: 'inp', type: 'password', placeholder: 'Enter Master Passcode', value: inputPass, onChange: (e) => setInputPass(e.target.value), autoFocus: true, style: { width: '100%', background: '#0a0d14', border: '1px solid rgba(229, 9, 20, 0.4)', color: '#ff4757', padding: '14px', borderRadius: '10px', fontSize: '1.15rem', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', fontWeight: '800', outline: 'none' } })
                        ]),
                        h('button', { key: 'sub', type: 'submit', style: { background: 'linear-gradient(135deg, #e50914, #ff4757)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '1.05rem', boxShadow: '0 6px 25px rgba(229, 9, 20, 0.45)' } }, '🔓 Unlock Admin Portal')
                    ])
                ])
            ]);
        }

        // Fetch Dashboard Data on initial load
        useEffect(() => {
            fetch('/api/admin/dashboard', { headers: { 'x-admin-password': adminSecret } })
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.adminControls && data.adminControls.rangeWeights) {
                        setRangeLow(data.adminControls.rangeWeights.low);
                        setRangeMed(data.adminControls.rangeWeights.med);
                        setRangeHigh(data.adminControls.rangeWeights.high);
                        setRangeUltra(data.adminControls.rangeWeights.ultra);
                        setMinCrash(data.adminControls.minCrashMultiplier || 1.00);
                        setMaxCrash(data.adminControls.maxCrashMultiplier || 250.00);
                    }
                }).catch(() => {});
        }, [adminSecret]);

        // Emergency Crash Action
        const handleEmergencyCrash = async () => {
            try {
                const res = await fetch('/api/admin/emergency-crash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSecret },
                    body: JSON.stringify({ password: adminSecret })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`🚨 EMERGENCY CRASH TRIGGERED AT ${data.crashedAt || 'CURRENT'}x!`, 'error');
                } else {
                    showToast(data.message || 'Emergency crash failed', 'error');
                }
            } catch (e) {
                showToast('API Request Failed', 'error');
            }
        };

        // Save Multiplier Range Probabilities
        const handleSaveRanges = async () => {
            try {
                const res = await fetch('/api/admin/update-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSecret },
                    body: JSON.stringify({
                        rangeWeights: { low: Number(rangeLow), med: Number(rangeMed), high: Number(rangeHigh), ultra: Number(rangeUltra) },
                        minCrashMultiplier: Number(minCrash),
                        maxCrashMultiplier: Number(maxCrash),
                        password: adminSecret
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Multiplier Range Probabilities Saved!', 'info');
                } else {
                    showToast(data.message || 'Save failed', 'error');
                }
            } catch (e) {
                showToast('Save Failed', 'error');
            }
        };

        // Force Target Multiplier Override
        const handleForceTarget = async () => {
            try {
                const res = await fetch('/api/admin/force-target', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSecret },
                    body: JSON.stringify({ targetMultiplier: Number(forceCrashInput), password: adminSecret })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`🎯 Next Round Target Forced to ${parseFloat(forceCrashInput).toFixed(2)}x`, 'info');
                } else {
                    showToast(data.message || 'Override failed', 'error');
                }
            } catch (e) {
                showToast('Override Failed', 'error');
            }
        };

        // Create New Merchant Account
        const handleCreateMerchant = async (e) => {
            e.preventDefault();
            if (!merchantName) return showToast('Enter Merchant Name', 'error');
            try {
                const res = await fetch('/api/admin/generate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSecret },
                    body: JSON.stringify({ platformName: merchantName, password: adminSecret })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`✅ Merchant Key Generated for "${merchantName}"!`, 'info');
                    const keyObj = data.apiKey || data.record;
                    setMerchantName('');
                    fetchApiKeys();
                    if (keyObj) {
                        setMerchantKey(keyObj.apiKey);
                        formatMessage(keyObj);
                    }
                } else {
                    showToast(data.message || 'Key generation failed', 'error');
                }
            } catch (err) {
                showToast('Key Generation Failed', 'error');
            }
        };

        // Format 1-Click Integration Message
        const formatMessage = (keyObj) => {
            if (!keyObj) return;
            const msg = `🚀 *AVIATOR PLATFORM MERCHANT INTEGRATION SPECIFICATIONS* 🚀\n--------------------------------------------------\n📌 *Platform Name*: ${keyObj.platformName || 'Merchant Partner'}\n🔑 *API Key*: ${keyObj.apiKey}\n🎯 *Prediction Endpoint*: http://localhost:3000/api/v1/predict\n📊 *Active Target Endpoint*: http://localhost:3000/api/v1/active-target\n\n🎮 *AUTH GAME LAUNCH URL*:\nhttp://localhost:3000/game/aviator?user=60040000208349&token=${keyObj.apiKey.substring(0, 32)}&lang=en&currency=${keyObj.currency || 'PKR'}&operator=${keyObj.platformName ? keyObj.platformName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'aaplay14'}\n\n📖 *Full API Docs*: http://localhost:3000/docs\n--------------------------------------------------`;
            setIntegrationMsg(msg);
        };

        return h('div', { style: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
            // Admin Portal Header Banner
            h('div', { key: 'hdr', style: { background: '#131b2e', border: '1px solid rgba(229, 9, 20, 0.3)', borderRadius: '20px', padding: '1.8rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' } }, [
                h('div', { key: 'l' }, [
                    h('div', { key: 'b', style: { background: 'rgba(229, 9, 20, 0.15)', color: '#e50914', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px', width: 'fit-content' } }, '🚨 MASTER OPERATOR CONTROL PANEL'),
                    h('h2', { key: 'h2', style: { fontSize: '2rem', fontWeight: '800', margin: '6px 0 0 0', color: '#f8fafc' } }, 'Aviator Engine & Merchant Aggregator Administration')
                ]),
                
                // Emergency Crash Button in Admin Header
                h('button', { 
                    key: 'em-btn', 
                    onClick: handleEmergencyCrash, 
                    className: 'emergency-btn-pulse',
                    style: { background: 'linear-gradient(135deg, #e50914 0%, #b30006 100%)', color: '#fff', border: '2px solid #ff4757', padding: '14px 28px', borderRadius: '12px', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 30px rgba(229, 9, 20, 0.6)' } 
                }, [
                    h('span', { key: 'i', style: { fontSize: '1.3rem' } }, '🚨'),
                    'INSTANT EMERGENCY CRASH NOW'
                ])
            ]),

            // 3 SaaS Admin Tabs Bar
            h('div', { key: 'tabs', style: { display: 'flex', gap: '1rem', background: '#090d16', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' } }, [
                h('button', { key: 't1', className: `admin-tab-btn ${adminTab === 'live' ? 'active' : ''}`, onClick: () => setAdminTab('live'), style: { flex: 1 } }, '📡 Tab 1: Live Stream & Emergency Control'),
                h('button', { key: 't2', className: `admin-tab-btn ${adminTab === 'ranges' ? 'active' : ''}`, onClick: () => setAdminTab('ranges'), style: { flex: 1 } }, '📊 Tab 2: Range Probabilities & Settings'),
                h('button', { key: 't3', className: `admin-tab-btn ${adminTab === 'merchants' ? 'active' : ''}`, onClick: () => setAdminTab('merchants'), style: { flex: 1 } }, '🔑 Tab 3: Merchant Accounts & 1-Click Specs')
            ]),

            // TAB 1: LIVE STREAM & EMERGENCY CONTROL
            adminTab === 'live' && h('div', { key: 'tab1-content', style: { display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
                // Live Stats Banner Grid
                h('div', { key: 'stats-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' } }, [
                    h('div', { key: 's1', className: 'feature-card', style: { border: '1px solid rgba(0, 240, 255, 0.3)' } }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' } }, 'Live Scheduled Target'),
                        h('div', { key: 'v', style: { fontSize: '2.5rem', fontWeight: '800', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace', margin: '4px 0' } }, `${parseFloat(targetMultiplier).toFixed(2)}x`),
                        h('div', { key: 'sub', style: { fontSize: '0.78rem', color: '#10b981' } }, 'RNG Engine Active')
                    ]),

                    h('div', { key: 's2', className: 'feature-card' }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' } }, 'Engine Status'),
                        h('div', { key: 'v', style: { fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', margin: '8px 0' } }, gameState && gameState.status ? gameState.status.toUpperCase() : 'WAITING'),
                        h('div', { key: 'sub', style: { fontSize: '0.78rem', color: '#00f0ff' } }, '60ms Sync Ticks')
                    ]),

                    h('div', { key: 's3', className: 'feature-card' }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' } }, 'Active Bets'),
                        h('div', { key: 'v', style: { fontSize: '2.5rem', fontWeight: '800', color: '#ffb703', fontFamily: 'JetBrains Mono, monospace', margin: '4px 0' } }, activeBets ? activeBets.length : 0),
                        h('div', { key: 'sub', style: { fontSize: '0.78rem', color: '#94a3b8' } }, 'Connected Round Players')
                    ]),

                    h('div', { key: 's4', className: 'feature-card' }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' } }, 'Active Sessions'),
                        h('div', { key: 'v', style: { fontSize: '2.5rem', fontWeight: '800', color: '#10b981', fontFamily: 'JetBrains Mono, monospace', margin: '4px 0' } }, activeSessions ? activeSessions.length : 0),
                        h('div', { key: 'sub', style: { fontSize: '0.78rem', color: '#94a3b8' } }, 'Merchant API Sessions')
                    ])
                ]),

                // Active User & Merchant Sessions Table
                h('div', { key: 'table-card', className: 'feature-card' }, [
                    h('div', { key: 'h', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' } }, [
                        h('h3', { key: 't', style: { fontSize: '1.2rem', fontWeight: '800', margin: 0 } }, '🌐 Active Real-Time User & Merchant Sessions'),
                        h('button', { key: 'ref', onClick: fetchActiveSessions, style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' } }, '🔄 Refresh Sessions')
                    ]),
                    activeSessions && activeSessions.length > 0 ? h('table', { key: 'tbl', style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' } }, [
                        h('thead', { key: 'th' }, [
                            h('tr', { key: 'r', style: { borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' } }, [
                                h('th', { key: '1', style: { padding: '10px' } }, 'Token / Session ID'),
                                h('th', { key: '2', style: { padding: '10px' } }, 'User ID'),
                                h('th', { key: '3', style: { padding: '10px' } }, 'Username'),
                                h('th', { key: '4', style: { padding: '10px' } }, 'Currency'),
                                h('th', { key: '5', style: { padding: '10px' } }, 'Balance')
                            ])
                        ]),
                        h('tbody', { key: 'tb' }, activeSessions.map((s, idx) => h('tr', { key: idx, style: { borderBottom: '1px solid rgba(255,255,255,0.05)' } }, [
                            h('td', { key: '1', style: { padding: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#00f0ff' } }, s.token ? `${s.token.substring(0, 16)}...` : 'N/A'),
                            h('td', { key: '2', style: { padding: '10px' } }, s.userId || 'Guest'),
                            h('td', { key: '3', style: { padding: '10px', fontWeight: '700' } }, s.username || 'Player'),
                            h('td', { key: '4', style: { padding: '10px', color: '#ffb703' } }, s.currency || 'PKR'),
                            h('td', { key: '5', style: { padding: '10px', fontFamily: 'JetBrains Mono, monospace' } }, `${s.balance || 1000} ${s.currency || 'PKR'}`)
                        ])))
                    ]) : h('div', { key: 'empty', style: { color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0' } }, 'No active user sessions currently connected.')
                ])
            ]),

            // TAB 2: RANGE PROBABILITIES & SETTINGS
            adminTab === 'ranges' && h('div', { key: 'tab2-content', style: { display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
                h('div', { key: 'range-card', className: 'feature-card' }, [
                    h('h3', { key: 'title', style: { fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.2rem', color: '#00f0ff' } }, '🎯 Multiplier Crash Range Percentage Weights'),
                    h('p', { key: 'desc', style: { color: '#94a3b8', fontSize: '0.92rem', marginBottom: '1.8rem' } }, 'Customize the overall probability percentage distribution for crash target multiplier tiers. Total sum recommended to equal 100%.'),

                    h('div', { key: 'sliders', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.8rem' } }, [
                        h('div', { key: 'r1', style: { background: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                            h('div', { key: 'lbl', style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' } }, [
                                h('span', { key: 't' }, 'Tier 1: Low Multiplier (1.00x - 1.99x)'),
                                h('span', { key: 'v', style: { color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' } }, `${rangeLow}%`)
                            ]),
                            h('input', { key: 'inp', type: 'range', min: 0, max: 100, value: rangeLow, onChange: (e) => setRangeLow(e.target.value), style: { width: '100%', accentColor: '#00f0ff' } })
                        ]),

                        h('div', { key: 'r2', style: { background: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                            h('div', { key: 'lbl', style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' } }, [
                                h('span', { key: 't' }, 'Tier 2: Medium Multiplier (2.00x - 9.99x)'),
                                h('span', { key: 'v', style: { color: '#10b981', fontFamily: 'JetBrains Mono, monospace' } }, `${rangeMed}%`)
                            ]),
                            h('input', { key: 'inp', type: 'range', min: 0, max: 100, value: rangeMed, onChange: (e) => setRangeMed(e.target.value), style: { width: '100%', accentColor: '#10b981' } })
                        ]),

                        h('div', { key: 'r3', style: { background: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                            h('div', { key: 'lbl', style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' } }, [
                                h('span', { key: 't' }, 'Tier 3: High Multiplier (10.00x - 50.00x)'),
                                h('span', { key: 'v', style: { color: '#ffb703', fontFamily: 'JetBrains Mono, monospace' } }, `${rangeHigh}%`)
                            ]),
                            h('input', { key: 'inp', type: 'range', min: 0, max: 100, value: rangeHigh, onChange: (e) => setRangeHigh(e.target.value), style: { width: '100%', accentColor: '#ffb703' } })
                        ]),

                        h('div', { key: 'r4', style: { background: '#090d16', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                            h('div', { key: 'lbl', style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '700' } }, [
                                h('span', { key: 't' }, 'Tier 4: Ultra High Multiplier (50.00x+)'),
                                h('span', { key: 'v', style: { color: '#e50914', fontFamily: 'JetBrains Mono, monospace' } }, `${rangeUltra}%`)
                            ]),
                            h('input', { key: 'inp', type: 'range', min: 0, max: 100, value: rangeUltra, onChange: (e) => setRangeUltra(e.target.value), style: { width: '100%', accentColor: '#e50914' } })
                        ])
                    ]),

                    // Min/Max bounds
                    h('div', { key: 'bounds', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1.8rem' } }, [
                        h('div', { key: 'min' }, [
                            h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Minimum Crash Multiplier Bounds:'),
                            h('input', { key: 'i', type: 'number', step: '0.01', value: minCrash, onChange: (e) => setMinCrash(e.target.value), style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace' } })
                        ]),
                        h('div', { key: 'max' }, [
                            h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Maximum Crash Multiplier Bounds:'),
                            h('input', { key: 'i', type: 'number', step: '0.01', value: maxCrash, onChange: (e) => setMaxCrash(e.target.value), style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace' } })
                        ])
                    ]),

                    h('button', { key: 'save', onClick: handleSaveRanges, style: { background: 'linear-gradient(135deg, #00f0ff, #00a8ff)', color: '#000', border: 'none', padding: '14px 28px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '1.8rem', fontSize: '1rem' } }, '💾 Save Multiplier Settings')
                ]),

                // Force Next Target Override Box
                h('div', { key: 'force-card', className: 'feature-card', style: { border: '1px solid rgba(255, 183, 3, 0.3)' } }, [
                    h('h3', { key: 't', style: { fontSize: '1.2rem', fontWeight: '800', color: '#ffb703', marginBottom: '8px' } }, '⚡ Force Next Scheduled Target Multiplier'),
                    h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.2rem' } }, 'Instantly override the pre-calculated RNG multiplier target for the upcoming flight round.'),
                    h('div', { key: 'row', style: { display: 'flex', gap: '1rem', alignItems: 'center' } }, [
                        h('input', { key: 'inp', type: 'number', step: '0.01', value: forceCrashInput, onChange: (e) => setForceCrashInput(e.target.value), style: { background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#ffb703', padding: '12px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', width: '200px', fontWeight: '800' } }),
                        h('button', { key: 'btn', onClick: handleForceTarget, style: { background: 'linear-gradient(135deg, #ffb703, #ff8800)', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' } }, '🎯 Override Next Target Multiplier')
                    ])
                ])
            ]),

            // TAB 3: MERCHANT ACCOUNTS & 1-CLICK SPECS
            adminTab === 'merchants' && h('div', { key: 'tab3-content', style: { display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
                // Create Merchant Form (Just Name Required)
                h('div', { key: 'create-card', className: 'feature-card' }, [
                    h('h3', { key: 'title', style: { fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.2rem', color: '#10b981' } }, '➕ Generate New Merchant API Key'),
                    h('form', { key: 'form', onSubmit: handleCreateMerchant, style: { display: 'flex', gap: '1rem', alignItems: 'end' } }, [
                        h('div', { key: 'name', style: { flex: 1 } }, [
                            h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '700' } }, 'Merchant / Platform Name:'),
                            h('input', { key: 'i', type: 'text', placeholder: 'Enter Merchant Name (e.g. CasinoX, WinPlay)', value: merchantName, onChange: (e) => setMerchantName(e.target.value), required: true, style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '1rem' } })
                        ]),
                        h('button', { key: 'sub', type: 'submit', style: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '1rem' } }, '🔑 Generate Merchant Key')
                    ])
                ]),

                // 1-Click Formatted Integration Message Box
                h('div', { key: 'msg-box', className: 'feature-card', style: { border: '1px solid rgba(0, 240, 255, 0.3)' } }, [
                    h('div', { key: 'hdr', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } }, [
                        h('h3', { key: 't', style: { fontSize: '1.2rem', fontWeight: '800', color: '#00f0ff', margin: 0 } }, '📋 1-Click Merchant Integration Message Box'),
                        h('button', { key: 'copy', onClick: () => { navigator.clipboard.writeText(integrationMsg); showToast('📋 Formatted Message Copied to Clipboard!', 'info'); }, style: { background: 'linear-gradient(135deg, #00f0ff, #00a8ff)', color: '#000', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' } }, '📋 Copy Formatted Specs')
                    ]),
                    h('textarea', { key: 'txt', readOnly: true, value: integrationMsg, style: { width: '100%', height: '200px', background: '#060911', border: '1px solid rgba(255,255,255,0.08)', color: '#00f0ff', padding: '1rem', borderRadius: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', lineHeight: '1.5', resize: 'none' } })
                ])
            ])
        ]);
    }

    // Docs Page Component (Public Aggregator & Predictor API Specifications Only)
    function DocsPage({ showToast }) {
        const copyText = (txt) => {
            navigator.clipboard.writeText(txt);
            showToast(`📋 Copied to clipboard!`, 'info');
        };

        const renderEndpointCard = ({ method, path, title, desc, headers, params, reqBody, resJson, curlSample }) => {
            const methodBg = method === 'POST' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
            const methodColor = method === 'POST' ? '#ef4444' : '#10b981';

            return h('div', { key: path + method, className: 'feature-card', style: { border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' } }, [
                // Header Bar
                h('div', { key: 'hdr', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' } }, [
                    h('div', { key: 'left', style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
                        h('span', { key: 'm', style: { background: methodBg, color: methodColor, padding: '6px 14px', borderRadius: '6px', fontWeight: '800', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem' } }, method),
                        h('code', { key: 'p', style: { fontSize: '1.25rem', fontWeight: '700', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' } }, path)
                    ]),
                    h('button', { key: 'copy', onClick: () => copyText(`http://localhost:3000${path}`), style: { background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' } }, '📋 Copy URL')
                ]),

                // Title & Description
                h('div', { key: 'desc-block' }, [
                    h('h3', { key: 't', style: { fontSize: '1.15rem', fontWeight: '800', margin: '0 0 6px 0', color: '#f8fafc' } }, title),
                    h('p', { key: 'd', style: { color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' } }, desc)
                ]),

                // Headers & Params Table (if present)
                (headers || params) && h('div', { key: 'params-block', style: { background: '#090d16', padding: '1rem 1.2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' } }, [
                    headers && h('div', { key: 'h-sec', style: { marginBottom: params ? '10px' : 0 } }, [
                        h('span', { key: 'hl', style: { color: '#ffb703', fontWeight: '700', fontSize: '0.85rem' } }, 'HTTP Headers: '),
                        h('code', { key: 'hv', style: { color: '#cbd5e1', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' } }, headers)
                    ]),
                    params && h('div', { key: 'p-sec' }, [
                        h('span', { key: 'pl', style: { color: '#00f0ff', fontWeight: '700', fontSize: '0.85rem' } }, 'Request Parameters / Body: '),
                        h('code', { key: 'pv', style: { color: '#cbd5e1', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' } }, params)
                    ])
                ]),

                // Request Body Schema (if POST)
                reqBody && h('div', { key: 'req-block' }, [
                    h('div', { key: 'lbl', style: { fontSize: '0.82rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' } }, 'POST Request Body Payload (JSON):'),
                    h('pre', { key: 'code', style: { background: '#060911', padding: '1rem', borderRadius: '10px', color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', margin: 0, border: '1px solid rgba(239, 68, 68, 0.2)', overflowX: 'auto' } }, reqBody)
                ]),

                // Response JSON Preview
                resJson && h('div', { key: 'res-block' }, [
                    h('div', { key: 'lbl', style: { fontSize: '0.82rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' } }, '200 OK Response Payload (JSON):'),
                    h('pre', { key: 'code', style: { background: '#060911', padding: '1rem', borderRadius: '10px', color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', margin: 0, border: '1px solid rgba(16, 185, 129, 0.2)', overflowX: 'auto' } }, resJson)
                ]),

                // cURL Example
                curlSample && h('div', { key: 'curl-block' }, [
                    h('div', { key: 'lbl', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } }, [
                        h('span', { key: 'txt', style: { fontSize: '0.82rem', fontWeight: '800', color: '#ffb703', textTransform: 'uppercase', letterSpacing: '0.8px' } }, 'cURL Request Sample:'),
                        h('button', { key: 'copy-curl', onClick: () => copyText(curlSample), style: { background: 'none', border: 'none', color: '#ffb703', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' } }, '📋 Copy cURL')
                    ]),
                    h('pre', { key: 'code', style: { background: '#060911', padding: '0.9rem', borderRadius: '10px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', margin: 0, border: '1px solid rgba(255, 183, 3, 0.2)', overflowX: 'auto' } }, curlSample)
                ])
            ]);
        };

        return h('div', { style: { padding: '2.5rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
            // Header Banner
            h('div', { key: 'hdr', style: { background: 'linear-gradient(180deg, #131b2e 0%, #090d16 100%)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' } }, [
                h('div', { key: 'b', style: { background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px', width: 'fit-content' } }, '📖 DEVELOPER & INTEGRATOR PORTAL'),
                h('h1', { key: 'h1', style: { fontSize: '2.5rem', fontWeight: '800', margin: '12px 0 8px 0' } }, 'Aviator Engine Integration Specifications'),
                h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '1.05rem', margin: 0, lineHeight: '1.6' } }, 'Public REST API reference for iGaming aggregators, merchant casino platforms, and live target predictor tools.')
            ]),

            // Endpoint 1: POST /api/v1/game/launch
            renderEndpointCard({
                method: 'POST',
                path: '/api/v1/game/launch',
                title: '🚀 Launch Game Session (POST)',
                desc: 'Generates a seamless authenticated player session and returns the direct embed iframe launchUrl.',
                headers: 'Content-Type: application/json, x-api-key: <merchant_key> (optional)',
                params: 'userId (req), username, balance, currency, operator, customToken',
                reqBody: `{
  "userId": "user_101",
  "username": "Player1",
  "balance": 5000.00,
  "currency": "PKR",
  "operator": "winplay"
}`,
                resJson: `{
  "success": true,
  "message": "Game session generated successfully. Launch user via launchUrl.",
  "token": "31333438335F7853577650474B3663725979796F49576D2B",
  "launchUrl": "http://localhost:3000/game/aviator?user=user_101&token=31333438335F78535776...&lang=en&currency=PKR",
  "session": {
    "token": "31333438335F7853577650474B3663725979796F49576D2B",
    "userId": "user_101",
    "username": "Player1",
    "balance": 5000,
    "currency": "PKR",
    "createdAt": 1788731800000
  }
}`,
                curlSample: `curl -X POST "http://localhost:3000/api/v1/game/launch" \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "user_101", "username": "Player1", "balance": 5000, "currency": "PKR"}'`
            }),

            // Endpoint 2: GET /api/v1/game/launch
            renderEndpointCard({
                method: 'GET',
                path: '/api/v1/game/launch',
                title: '🚀 Launch Game Session (GET Query Shorthand)',
                desc: '1-click GET request shortcut for instant iframe launching from URL query parameters.',
                params: '?user=user_101&username=Player1&balance=5000&currency=PKR&apiKey=master_key_admin',
                resJson: `{
  "success": true,
  "token": "a82f10b4c89...",
  "launchUrl": "http://localhost:3000/game/aviator?user=user_101&token=a82f10b4c89...&lang=en&currency=PKR"
}`,
                curlSample: `curl -X GET "http://localhost:3000/api/v1/game/launch?user=user_101&username=Player1&balance=5000&currency=PKR"`
            }),

            // Endpoint 3: GET /api/v1/predict
            renderEndpointCard({
                method: 'GET',
                path: '/api/v1/predict',
                title: '🎯 Live Target Multiplier Prediction API',
                desc: 'Returns the pre-calculated target crash multiplier for the currently active or upcoming scheduled flight round.',
                headers: 'x-api-key: master_key_admin (or ?apiKey=master_key_admin)',
                params: '?apiKey=master_key_admin',
                resJson: `{
  "success": true,
  "service": "Aviator Engine Live Prediction & Target Multiplier API",
  "platform": "Master Platform Integrator",
  "targetCrashMultiplier": 4.82,
  "roundStatus": "FLYING",
  "roundId": 1005,
  "timestamp": 1788731549509
}`,
                curlSample: `curl -X GET "http://localhost:3000/api/v1/predict?apiKey=master_key_admin"`
            })
        ]);
    }

    // Dashboard Component
    function DashboardPage() {
        return h('div', { style: { padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
            h('div', { key: 'c', className: 'feature-card', style: { padding: '2.5rem' } }, [
                h('h2', { key: 'h', style: { fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' } }, '👤 Merchant & User Portal Overview'),
                h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6' } }, 'Welcome to your Aviator Aggregator portal. Monitor active API keys, session tokens, and game balance metrics.'),
                h('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' } }, [
                    h('div', { key: 'b1', style: { background: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8' } }, 'DEMO WALLET BALANCE'),
                        h('div', { key: 'v', style: { fontSize: '2rem', fontWeight: '800', color: '#10b981', fontFamily: 'JetBrains Mono, monospace' } }, '1,000.00 PKR')
                    ]),
                    h('div', { key: 'b2', style: { background: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8' } }, 'ACTIVE API KEYS'),
                        h('div', { key: 'v', style: { fontSize: '2rem', fontWeight: '800', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' } }, '1 Active')
                    ]),
                    h('div', { key: 'b3', style: { background: '#090d16', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' } }, [
                        h('div', { key: 'l', style: { fontSize: '0.8rem', color: '#94a3b8' } }, 'SYSTEM STATUS'),
                        h('div', { key: 'v', style: { fontSize: '1.5rem', fontWeight: '800', color: '#10b981' } }, 'ONLINE (100%)')
                    ])
                ])
            ])
        ]);
    }

    // Contact Page Component
    function ContactPage({ showToast }) {
        const [name, setName] = useState('');
        const [email, setEmail] = useState('');
        const [company, setCompany] = useState('');
        const [message, setMessage] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!name || !email || !message) return showToast('Please complete all required fields', 'error');
            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, company, message })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Inquiry Sent! Our Sales Team will contact you shortly.', 'info');
                    setName(''); setEmail(''); setCompany(''); setMessage('');
                } else {
                    showToast('Failed to send inquiry', 'error');
                }
            } catch (err) {
                showToast('API Submission Failed', 'error');
            }
        };

        return h('div', { style: { padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' } }, [
            h('div', { key: 'card', className: 'feature-card', style: { padding: '3rem' } }, [
                h('h2', { key: 'h', style: { fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' } }, '📬 Contact Integration Sales Team'),
                h('p', { key: 'p', style: { color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' } }, 'Get in touch for custom Aviator white-label licenses, merchant API key onboarding, or technical support.'),
                
                h('form', { key: 'f', onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '1.2rem' } }, [
                    h('div', { key: 'r1', style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem' } }, [
                        h('div', { key: 'n' }, [
                            h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Your Name: *'),
                            h('input', { key: 'i', type: 'text', value: name, onChange: (e) => setName(e.target.value), required: true, style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px' } })
                        ]),
                        h('div', { key: 'e' }, [
                            h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Email Address: *'),
                            h('input', { key: 'i', type: 'email', value: email, onChange: (e) => setEmail(e.target.value), required: true, style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px' } })
                        ])
                    ]),
                    h('div', { key: 'c' }, [
                        h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Platform / Company Name:'),
                        h('input', { key: 'i', type: 'text', value: company, onChange: (e) => setCompany(e.target.value), style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px' } })
                    ]),
                    h('div', { key: 'm' }, [
                        h('label', { key: 'l', style: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' } }, 'Message / Inquiry Details: *'),
                        h('textarea', { key: 'i', rows: 4, value: message, onChange: (e) => setMessage(e.target.value), required: true, style: { width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px', borderRadius: '8px', resize: 'none' } })
                    ]),
                    h('button', { key: 's', type: 'submit', style: { background: 'linear-gradient(135deg, #00f0ff, #00a8ff)', color: '#000', border: 'none', padding: '14px 28px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '1rem', marginTop: '1rem' } }, '🚀 Submit Sales Inquiry')
                ])
            ])
        ]);
    }

    // Main App Component
    function App() {
        const [activeRoute, setActiveRoute] = useState(() => {
            const p = window.location.pathname;
            if (p.includes('/admin')) return 'admin';
            if (p.includes('/docs')) return 'docs';
            if (p.includes('/contact')) return 'contact';
            if (p.includes('/user/dashboard')) return 'dashboard';
            return 'home';
        });

        const [adminSecret, setAdminSecret] = useState('admin123');
        const [isConnected, setIsConnected] = useState(false);
        const [toast, setToast] = useState(null);

        // Game State Sync
        const [targetMultiplier, setTargetMultiplier] = useState(2.00);
        const [gameState, setGameState] = useState(null);
        const [activeBets, setActiveBets] = useState([]);
        const [activeSessions, setActiveSessions] = useState([]);
        const [contactMessages, setContactMessages] = useState([]);
        const [apiKeys, setApiKeys] = useState([]);

        const showToast = (message, type = 'info') => {
            setToast({ message, type });
            setTimeout(() => setToast(null), 4000);
        };

        useEffect(() => {
            const socket = window.io ? window.io() : null;
            if (!socket) return;

            socket.on('connect', () => {
                setIsConnected(true);
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });

            const handleState = (state) => {
                if (state) {
                    setGameState(state);
                    const t = state.targetCrashMultiplier || (state.gameState && state.gameState.targetCrashMultiplier);
                    if (t) setTargetMultiplier(t);
                    if (state.activeBets) setActiveBets(Object.values(state.activeBets));
                }
            };

            socket.on('game_state', handleState);
            socket.on('admin_stats_update', (d) => {
                if (d && d.gameState && d.gameState.targetCrashMultiplier) {
                    setTargetMultiplier(d.gameState.targetCrashMultiplier);
                }
            });

            return () => {
                socket.disconnect();
            };
        }, []);

        const fetchActiveSessions = () => {
            fetch('/api/admin/sessions', { headers: { 'x-admin-password': adminSecret } })
                .then(r => r.json())
                .then(data => { if (data.success) setActiveSessions(data.sessions); })
                .catch(() => {});
        };

        const fetchContactMessages = () => {
            fetch('/api/admin/contact-messages', { headers: { 'x-admin-password': adminSecret } })
                .then(r => r.json())
                .then(data => { if (data.success) setContactMessages(data.messages); })
                .catch(() => {});
        };

        const fetchApiKeys = () => {
            fetch('/api/admin/keys', { headers: { 'x-admin-password': adminSecret } })
                .then(r => r.json())
                .then(data => { if (data.success) setApiKeys(data.keys); })
                .catch(() => {});
        };

        useEffect(() => {
            if (activeRoute === 'admin') {
                fetchActiveSessions();
                fetchContactMessages();
                fetchApiKeys();
            }
        }, [activeRoute, adminSecret]);

        // Dynamic URL Route Sync
        const routePathMap = {
            'home': '/home',
            'admin': '/admin',
            'docs': '/docs',
            'dashboard': '/user/dashboard',
            'contact': '/contact'
        };

        const handleNavigate = (newRoute) => {
            const path = routePathMap[newRoute] || '/home';
            if (window.location.pathname !== path) {
                window.history.pushState({ route: newRoute }, '', path);
            }
            setActiveRoute(newRoute);
        };

        useEffect(() => {
            const handlePopState = () => {
                const p = window.location.pathname;
                if (p.includes('/admin')) setActiveRoute('admin');
                else if (p.includes('/docs')) setActiveRoute('docs');
                else if (p.includes('/contact')) setActiveRoute('contact');
                else if (p.includes('/user/dashboard')) setActiveRoute('dashboard');
                else setActiveRoute('home');
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }, []);

        return h('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16', color: '#f8fafc' } }, [
            h(Header, { key: 'hdr', activeRoute, setActiveRoute: handleNavigate, isConnected, adminSecret, setAdminSecret }),
            
            h('main', { key: 'main', style: { flex: 1 } }, [
                activeRoute === 'home' && h(HomePage, { key: 'home', setActiveRoute: handleNavigate, targetMultiplier }),
                activeRoute === 'admin' && h(AdminPage, { key: 'admin', adminSecret, setAdminSecret, showToast, targetMultiplier, gameState, activeBets, activeSessions, fetchActiveSessions, contactMessages, fetchContactMessages, apiKeys, fetchApiKeys }),
                activeRoute === 'docs' && h(DocsPage, { key: 'docs', showToast }),
                activeRoute === 'contact' && h(ContactPage, { key: 'cnt', showToast }),
                activeRoute === 'dashboard' && h(DashboardPage, { key: 'dash' })
            ]),

            h(Toast, { key: 'toast', toast })
        ]);
    }

    // Mount React App to DOM
    const rootEl = document.getElementById('react-root');
    if (rootEl) {
        ReactDOM.createRoot(rootEl).render(h(App));
    }
})();
