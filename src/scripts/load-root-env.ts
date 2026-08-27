import { setDefaultResultOrder } from "node:dns";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Node < 17
}

/**
 * Load project-root `.env` into process.env for CLI scripts (tsx does not).
 */
export function loadRootEnv(): void {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const existing = process.env[key];
    if (!existing || existing.trim() === "") {
      process.env[key] = value;
    }
  }
}

/**
 * CLI rebuilds should not emit Prisma query logs even when the shell has NODE_ENV=development.
 */
export function silencePrismaQueryLogsForCli(): void {
  const env = process.env as Record<string, string | undefined>;
  if (env.NODE_ENV === "development") {
    env.NODE_ENV = "production";
  }
}
