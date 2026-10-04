#!/usr/bin/env node

/**
 * Cross-platform runner: sets NODE_OPTIONS=--dns-result-order=ipv4first
 * then spawns the given command (Unix env prefix fails on Windows cmd).
 */

'use strict';

const { spawnSync } = require('child_process');
const { withIpv4FirstDnsEnv } = require('./force-ipv4-dns.cjs');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-with-ipv4-dns.cjs <command> [...args]');
  process.exit(1);
}

const [command, ...commandArgs] = args;
const child = spawnSync(command, commandArgs, {
  stdio: 'inherit',
  env: withIpv4FirstDnsEnv(process.env),
  shell: process.platform === 'win32',
});

if (child.error) {
  console.error(child.error);
  process.exit(1);
}

process.exit(child.status === null ? 1 : child.status);
