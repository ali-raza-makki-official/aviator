const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AdminAuditStore {
  constructor() {
    this.auditFilePath = path.join(__dirname, '../data/admin_audit.json');
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      const dataDir = path.dirname(this.auditFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.auditFilePath)) {
        const raw = fs.readFileSync(this.auditFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.error('[AdminAuditStore] Failed to load admin_audit.json:', err.message);
    }
    return [];
  }

  saveLogs() {
    try {
      const tempPath = `${this.auditFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.logs, null, 2), 'utf8');
      fs.renameSync(tempPath, this.auditFilePath);
    } catch (err) {
      console.error('[AdminAuditStore] Failed to save admin_audit.json:', err.message);
    }
  }

  logAction({ adminId = 'admin', action, targetResource = 'system', oldValue = null, newValue = null, reason = 'N/A', ip = '127.0.0.1', reqId = null }) {
    const entry = {
      auditId: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      adminId,
      action,
      targetResource,
      oldValue,
      newValue,
      reason,
      ip,
      reqId: reqId || `req_${Date.now()}`,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    // Immutable append-only
    this.logs.unshift(entry);
    this.saveLogs();
    console.log(`[ADMIN AUDIT] [${action}] by ${adminId} on ${targetResource}: ${reason}`);
    return entry;
  }

  getAuditLogs(limit = 100, offset = 0, filter = null) {
    let result = this.logs;
    if (filter && filter.action) {
      result = result.filter(l => l.action === filter.action);
    }
    if (filter && filter.adminId) {
      result = result.filter(l => l.adminId === filter.adminId);
    }
    return {
      total: result.length,
      logs: result.slice(offset, offset + limit)
    };
  }
}

module.exports = new AdminAuditStore();
