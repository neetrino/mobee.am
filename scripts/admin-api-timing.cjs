/**
 * One-off script: measure admin API endpoint latency (no auth — reports 401 timing).
 * Run: node scripts/admin-api-timing.cjs
 */
const BASE = process.env.APP_URL || 'http://localhost:3000';

const ENDPOINTS = [
  '/api/v1/admin/dashboard?recentOrdersLimit=5&topProductsLimit=5&userActivityLimit=10',
  '/api/v1/admin/products?page=1&limit=20',
  '/api/v1/admin/orders?page=1&limit=20',
  '/api/v1/admin/users?page=1&limit=20',
  '/api/v1/admin/categories',
  '/api/v1/admin/stats?period=week',
  '/api/v1/admin/settings',
  '/api/v1/users/profile',
];

async function measure(path) {
  const url = `${BASE}${path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { credentials: 'include' });
    const body = await res.text();
    const ms = Math.round(performance.now() - start);
    return { path, ms, status: res.status, size: body.length };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    return { path, ms, status: 'ERR', size: 0, error: String(err) };
  }
}

async function main() {
  console.log(`Admin API timing probe → ${BASE}\n`);
  for (const path of ENDPOINTS) {
    const r = await measure(path);
    console.log(`${r.path} → ${r.ms}ms status=${r.status} size=${r.size}`);
  }
}

main();
