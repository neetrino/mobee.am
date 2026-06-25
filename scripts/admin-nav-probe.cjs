/**
 * One-off script: measure admin API endpoint latency with auth session.
 * Run: node scripts/admin-nav-probe.cjs
 */
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const eq = t.indexOf('=');
      if (eq <= 0) return;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    });
}

loadEnv(path.join(__dirname, '../.env'));

const BASE = process.env.APP_URL || 'http://localhost:3000';
const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'image.png';

const ADMIN_ROUTES = [
  '/supersudo',
  '/supersudo/products',
  '/supersudo/orders',
  '/supersudo/users',
  '/supersudo/analytics',
  '/supersudo/settings',
];

const ADMIN_APIS = [
  '/api/v1/admin/dashboard?recentOrdersLimit=5&topProductsLimit=5&userActivityLimit=10',
  '/api/v1/admin/products?page=1&limit=20',
  '/api/v1/admin/orders?page=1&limit=20',
  '/api/v1/admin/users?page=1&limit=20',
  '/api/v1/admin/stats?period=week',
  '/api/v1/admin/categories',
  '/api/v1/admin/settings',
];

function extractCookies(setCookieHeaders) {
  const jar = {};
  for (const h of setCookieHeaders) {
    const part = h.split(';')[0];
    const eq = part.indexOf('=');
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function timedFetch(url, opts = {}) {
  const start = performance.now();
  const res = await fetch(url, opts);
  const text = await res.text();
  const ms = Math.round(performance.now() - start);
  return { ms, status: res.status, size: text.length, headers: res.headers, text };
}

async function login() {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const raw = res.headers.getSetCookie?.() ?? [];
  const jar = extractCookies(raw);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${JSON.stringify(body)}`);
  return jar;
}

async function measureRsc(route, jar, label) {
  const url = `${BASE}${route}`;
  const { ms, status, size, headers } = await timedFetch(url, {
    headers: {
      Cookie: cookieHeader(jar),
      Accept: 'text/x-component',
      RSC: '1',
      'Next-Router-Prefetch': '1',
    },
  });
  const nextAction = headers.get('x-nextjs-cache') || headers.get('cache-control') || '-';
  console.log(`  [RSC ${label}] ${route} → ${ms}ms status=${status} size=${size} cache=${nextAction}`);
  return ms;
}

async function measureDoc(route, jar, label) {
  const url = `${BASE}${route}`;
  const { ms, status, size } = await timedFetch(url, {
    headers: { Cookie: cookieHeader(jar) },
  });
  console.log(`  [DOC ${label}] ${route} → ${ms}ms status=${status} size=${size}`);
  return ms;
}

async function measureApi(path, jar) {
  const url = `${BASE}${path}`;
  const { ms, status, size } = await timedFetch(url, {
    headers: { Cookie: cookieHeader(jar) },
  });
  console.log(`  [API] ${path.split('?')[0]} → ${ms}ms status=${status} size=${size}`);
  return ms;
}

async function main() {
  console.log(`\n=== Admin Nav Probe → ${BASE} ===\n`);
  console.log('Logging in...');
  const jar = await login();
  console.log('Login OK\n');

  console.log('--- API endpoints (authenticated) ---');
  const apiTimes = {};
  for (const path of ADMIN_APIS) {
    apiTimes[path] = await measureApi(path, jar);
  }

  console.log('\n--- Page navigation (first vs second visit) ---');
  const results = [];
  for (const route of ADMIN_ROUTES) {
    console.log(`\nRoute: ${route}`);
    const firstDoc = await measureDoc(route, jar, '1st');
    const firstRsc = await measureRsc(route, jar, '1st');
    const secondDoc = await measureDoc(route, jar, '2nd');
    const secondRsc = await measureRsc(route, jar, '2nd');
    results.push({ route, firstDoc, firstRsc, secondDoc, secondRsc });
  }

  console.log('\n--- Summary table ---');
  console.log('Route | 1st DOC | 1st RSC | 2nd DOC | 2nd RSC');
  for (const r of results) {
    console.log(
      `${r.route} | ${r.firstDoc}ms | ${r.firstRsc}ms | ${r.secondDoc}ms | ${r.secondRsc}ms`,
    );
  }

  const maxApi = Math.max(...Object.values(apiTimes));
  console.log(`\nSlowest API: ${maxApi}ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
