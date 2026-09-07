const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ApiKeyStore {
  constructor() {
    this.filePath = path.join(__dirname, '../data/api_keys.json');
    this.rateLimitMap = new Map(); // keyHash -> { count, windowStart }
    this.keys = this.loadKeys();

    // Default migration seed if file is empty
    if (this.keys.length === 0) {
      this.migrateLegacyKeys();
    }
  }

  hashKey(rawKey) {
    if (!rawKey) return null;
    return crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');
  }

  loadKeys() {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('[ApiKeyStore] Failed to load api_keys.json:', err.message);
    }
    return [];
  }

  saveKeys() {
    try {
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.keys, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[ApiKeyStore] Failed to save api_keys.json:', err.message);
    }
  }

  migrateLegacyKeys() {
    console.log('[ApiKeyStore] Migrating legacy API keys into secure hashed storage...');
    const legacyKeys = [
      {
        id: 'key_master_admin',
        platformName: 'Master Platform Integrator',
        tier: 'ENTERPRISE',
        rawKey: 'AVIATOR_API_KEY_PREDICT_2026',
        scopes: ['prediction:read', 'game:launch', 'webhook:read', 'webhook:write', 'admin:read', 'admin:write']
      },
      {
        id: 'key_platform_alpha',
        platformName: 'Casino Platform Alpha',
        tier: 'PREMIUM',
        rawKey: 'av_live_key_9876543210',
        scopes: ['prediction:read', 'game:launch', 'webhook:read']
      }
    ];

    for (const item of legacyKeys) {
      this.registerKey(item.id, item.platformName, item.tier, item.rawKey, item.scopes);
    }
  }

  generateSecret() {
    return `av_live_${crypto.randomBytes(24).toString('hex')}`;
  }

  registerKey(id, platformName, tier = 'STANDARD', customKey = null, scopes = null) {
    const rawSecret = customKey || this.generateSecret();
    const keyHash = this.hashKey(rawSecret);
    const keyPrefix = rawSecret.substring(0, 10);
    const keySuffix = rawSecret.substring(rawSecret.length - 4);

    const defaultScopes = scopes || (
      tier === 'ENTERPRISE'
        ? ['prediction:read', 'game:launch', 'webhook:read', 'webhook:write']
        : tier === 'PREMIUM'
        ? ['prediction:read', 'game:launch']
        : ['prediction:read']
    );

    const now = Date.now();
    const record = {
      id: id || `key_${now}_${crypto.randomBytes(4).toString('hex')}`,
      platformName: platformName || 'External Partner',
      tier,
      keyHash,
      keyPreview: `${keyPrefix}...${keySuffix}`,
      scopes: defaultScopes,
      status: 'ACTIVE',
      rateLimitPerMinute: tier === 'ENTERPRISE' ? 300 : tier === 'PREMIUM' ? 120 : 60,
      totalRequests: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: null,
      revokedAt: null
    };

    // Replace if same id exists
    const idx = this.keys.findIndex(k => k.id === record.id || k.keyHash === keyHash);
    if (idx !== -1) {
      this.keys[idx] = record;
    } else {
      this.keys.push(record);
    }
    this.saveKeys();

    return {
      record,
      secretKey: rawSecret // Exposed ONLY ONCE upon creation
    };
  }

  validateKey(rawKey, requiredScope = null) {
    if (!rawKey) return { valid: false, error: 'Missing API key' };
    const hash = this.hashKey(rawKey);
    const record = this.keys.find(k => k.keyHash === hash);

    if (!record) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (record.status !== 'ACTIVE') {
      return { valid: false, error: `API key is ${record.status.toLowerCase()}` };
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check Scope Authorization
    if (requiredScope && !record.scopes.includes(requiredScope)) {
      return {
        valid: false,
        error: `Forbidden: API key lacks required scope '${requiredScope}'`,
        code: 'INSUFFICIENT_SCOPE',
        record
      };
    }

    // Rate Limiting Check
    const rateLimit = this.checkRateLimit(record);
    if (!rateLimit.allowed) {
      return {
        valid: false,
        error: `Rate limit exceeded (${record.rateLimitPerMinute} req/min). Retry after ${rateLimit.retryAfterSec}s`,
        code: 'RATE_LIMIT_EXCEEDED'
      };
    }

    record.totalRequests++;
    record.lastUsedAt = new Date().toISOString();
    this.saveKeys();

    return { valid: true, record };
  }

  checkRateLimit(record) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = record.rateLimitPerMinute || 60;

    let bucket = this.rateLimitMap.get(record.keyHash);
    if (!bucket || (now - bucket.windowStart) >= windowMs) {
      bucket = { count: 1, windowStart: now };
      this.rateLimitMap.set(record.keyHash, bucket);
      return { allowed: true };
    }

    if (bucket.count >= limit) {
      const retryAfterSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSec };
    }

    bucket.count++;
    return { allowed: true };
  }

  listKeys() {
    // NEVER return secretKey or full plaintext keys
    return this.keys.map(k => ({
      id: k.id,
      platformName: k.platformName,
      tier: k.tier,
      keyPreview: k.keyPreview,
      scopes: k.scopes,
      status: k.status,
      rateLimitPerMinute: k.rateLimitPerMinute,
      totalRequests: k.totalRequests,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt
    }));
  }

  revokeKey(keyId) {
    const record = this.keys.find(k => k.id === keyId || k.keyHash === this.hashKey(keyId));
    if (record) {
      record.status = 'REVOKED';
      record.revokedAt = new Date().toISOString();
      this.saveKeys();
      return { success: true, record };
    }
    return { success: false, error: 'Key not found' };
  }

  rotateKey(keyId) {
    const record = this.keys.find(k => k.id === keyId || k.keyHash === this.hashKey(keyId));
    if (!record) {
      return { success: false, error: 'Key not found' };
    }

    // Revoke old key
    record.status = 'REVOKED';
    record.revokedAt = new Date().toISOString();

    // Create rotated successor key
    const newSecret = this.generateSecret();
    const newHash = this.hashKey(newSecret);
    const keyPrefix = newSecret.substring(0, 10);
    const keySuffix = newSecret.substring(newSecret.length - 4);

    const now = Date.now();
    const newRecord = {
      id: `key_${now}_${crypto.randomBytes(4).toString('hex')}`,
      platformName: record.platformName,
      tier: record.tier,
      keyHash: newHash,
      keyPreview: `${keyPrefix}...${keySuffix}`,
      scopes: record.scopes,
      status: 'ACTIVE',
      rateLimitPerMinute: record.rateLimitPerMinute,
      totalRequests: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: null,
      revokedAt: null
    };

    this.keys.push(newRecord);
    this.saveKeys();

    return {
      success: true,
      oldKeyId: record.id,
      newRecord,
      secretKey: newSecret // Disclosed ONLY once
    };
  }
}

module.exports = new ApiKeyStore();
