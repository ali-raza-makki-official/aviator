const crypto = require('crypto');

class ApiKeyStore {
  constructor() {
    this.keys = new Map();
    
    // Seed default master integration API keys for testing & prediction access
    this.registerKey('master_key_admin', 'Master Platform Integrator', 'ENTERPRISE', 'AVIATOR_API_KEY_PREDICT_2026');
    this.registerKey('demo_key_platform1', 'Casino Platform Alpha', 'PREMIUM', 'av_live_key_9876543210');
  }

  registerKey(id, platformName, tier = 'STANDARD', customKey = null) {
    const apiKey = customKey || `av_live_key_${crypto.randomBytes(12).toString('hex')}`;
    const record = {
      id,
      platformName,
      apiKey,
      tier, // 'STANDARD' | 'PREMIUM' | 'ENTERPRISE'
      status: 'ACTIVE',
      totalRequests: 0,
      createdAt: new Date().toISOString()
    };
    this.keys.set(apiKey, record);
    return record;
  }

  validateKey(key) {
    if (!key) return null;
    const cleanKey = String(key).trim();
    const record = this.keys.get(cleanKey);
    if (record && record.status === 'ACTIVE') {
      record.totalRequests++;
      return record;
    }
    return null;
  }

  listKeys() {
    return Array.from(this.keys.values());
  }

  revokeKey(apiKey) {
    if (this.keys.has(apiKey)) {
      this.keys.get(apiKey).status = 'REVOKED';
      return true;
    }
    return false;
  }
}

module.exports = new ApiKeyStore();
