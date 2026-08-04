'use strict';

/**
 * Prefer IPv4 when DNS returns A + AAAA.
 * Neon pooler hosts often resolve to unreachable IPv6 on local networks,
 * which Prisma reports as P1001 "Can't reach database server".
 */
const dns = require('dns');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Node < 17 — ignore
}

const IPV4_FIRST_FLAG = '--dns-result-order=ipv4first';

/**
 * Ensure child processes inherit IPv4-first DNS (appends if NODE_OPTIONS already set).
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
function withIpv4FirstDnsEnv(env = process.env) {
  const current = env.NODE_OPTIONS ?? '';
  if (current.includes('dns-result-order=ipv4first')) {
    return env;
  }
  return {
    ...env,
    NODE_OPTIONS: current.trim() ? `${current} ${IPV4_FIRST_FLAG}` : IPV4_FIRST_FLAG,
  };
}

module.exports = { withIpv4FirstDnsEnv };
