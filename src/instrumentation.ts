/**
 * Prefer IPv4 DNS order so Neon/Prisma can connect when local IPv6 is unreachable.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const dns = await import('node:dns');
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Node < 17 — ignore
  }
}
