const dns = require('dns').promises;
const url = require('url');

class SsrfValidator {
  static isPrivateOrLoopbackIP(ip) {
    if (!ip) return true;

    // IPv4 Loopback (127.0.0.0/8)
    if (ip.startsWith('127.')) return true;

    // IPv6 Loopback / Local
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;

    // 0.0.0.0
    if (ip === '0.0.0.0') return true;

    // Cloud Metadata / Link-Local (169.254.0.0/16)
    if (ip.startsWith('169.254.')) return true;

    // RFC1918 Private Ranges:
    // 10.0.0.0/8
    if (ip.startsWith('10.')) return true;

    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
    }

    return false;
  }

  static async validateWebhookUrl(rawUrl, allowLocalForTesting = false) {
    let parsed;
    try {
      parsed = new url.URL(rawUrl);
    } catch (e) {
      return { valid: false, error: 'Malformed or invalid URL' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Protocol must be http or https' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check direct hostname blocking
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      if (!allowLocalForTesting) {
        return { valid: false, error: 'Localhost and loopback webhook URLs are strictly prohibited' };
      }
    }

    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return { valid: false, error: 'Internal and private domain names are blocked' };
    }

    // Direct IP check
    if (this.isPrivateOrLoopbackIP(hostname)) {
      if (!allowLocalForTesting) {
        return { valid: false, error: 'Target destination points to a private or internal network address' };
      }
    }

    // DNS Resolution check to prevent DNS rebinding attacks
    try {
      const records = await dns.lookup(hostname, { all: true });
      for (const rec of records) {
        if (this.isPrivateOrLoopbackIP(rec.address)) {
          if (!allowLocalForTesting) {
            return { valid: false, error: `Resolved IP address ${rec.address} belongs to a prohibited private/internal network` };
          }
        }
      }
    } catch (dnsErr) {
      // If DNS resolution fails, reject
      return { valid: false, error: `DNS lookup failed for destination hostname: ${dnsErr.message}` };
    }

    return { valid: true, hostname, protocol: parsed.protocol };
  }
}

module.exports = SsrfValidator;
