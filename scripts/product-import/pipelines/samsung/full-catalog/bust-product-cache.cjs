"use strict";

const path = require("path");
const fs = require("fs");
const { LOCALES, ROOT } = require("./constants.cjs");

const CACHE_PREFIX = "products:detail:v1";

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function buildKeys(slugs) {
  const keys = [];
  for (const slug of slugs) {
    for (const locale of LOCALES) {
      keys.push(`${CACHE_PREFIX}:${slug}:${locale}`);
    }
  }
  return keys;
}

async function bustProductDetailCache(slugs) {
  loadEnv();
  const keys = buildKeys(slugs);
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken) {
    const { Redis } = require("@upstash/redis");
    const redis = new Redis({ url: restUrl, token: restToken });
    await redis.del(...keys);
    return { mode: "upstash", deleted: keys.length };
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && redisUrl !== "redis://localhost:6379") {
    const Redis = require("ioredis");
    const client = new Redis(redisUrl);
    await client.del(...keys);
    client.disconnect();
    return { mode: "redis", deleted: keys.length };
  }

  return { mode: "memory_only", deleted: 0, note: "No shared Redis configured; restart dev server to clear memory cache." };
}

module.exports = { bustProductDetailCache, buildKeys };
