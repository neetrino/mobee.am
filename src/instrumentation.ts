/**
 * Prefer IPv4 DNS order so Neon/Prisma can connect when local IPv6 is unreachable.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // webpackIgnore: do not let webpack resolve the `node:` scheme into the client graph.
  const dns = await import(/* webpackIgnore: true */ "node:dns");
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Node < 17 — ignore
  }

  const { assertProductionCoreEnv } = await import("@/config/env");
  assertProductionCoreEnv();
}
