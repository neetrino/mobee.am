import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const guard = require("../../../scripts/phase4-db-url-guard.cjs") as {
  applyPrismaDotenvPrecedence: (
    processEnv: Record<string, string | undefined>,
    dotenvEntries: Record<string, string>,
  ) => Record<string, string | undefined>;
  assertEffectiveDatabaseTargets: (
    env: Record<string, string | undefined>,
    expected: { port: string; database: string },
  ) => void;
  parseDotenvContents: (contents: string) => Record<string, string>;
  resolveEffectiveDatabaseEnv: (
    childEnv: Record<string, string | undefined>,
    dotenvContents: string,
  ) => Record<string, string | undefined>;
};

const LOCAL = "postgresql://phase4:phase4test@127.0.0.1:55432/phase4?schema=public";
const NEON = "postgresql://app:secret-neon-password@ep-cool.neon.tech/neondb?sslmode=require";
const EXPECTED = { port: "55432", database: "phase4" };

describe("Phase 4 database URL guard", () => {
  it("lets process env win over a Neon .env value", () => {
    const effective = guard.resolveEffectiveDatabaseEnv(
      { DATABASE_URL: LOCAL, DIRECT_URL: LOCAL },
      `DATABASE_URL="${NEON}"\nDIRECT_URL='${NEON}'\n`,
    );
    expect(effective.DATABASE_URL).toBe(LOCAL);
    expect(effective.DIRECT_URL).toBe(LOCAL);
    expect(() => guard.assertEffectiveDatabaseTargets(effective, EXPECTED)).not.toThrow();
  });

  it("rejects a Neon effective URL before any Prisma command would run", () => {
    const effective = guard.resolveEffectiveDatabaseEnv(
      {},
      `DATABASE_URL=${NEON}\nDIRECT_URL=${NEON}\n`,
    );
    expect(() => guard.assertEffectiveDatabaseTargets(effective, EXPECTED)).toThrow(
      /host is not the disposable Postgres container/,
    );
  });

  it("does not put credentials into assertion errors", () => {
    try {
      guard.assertEffectiveDatabaseTargets({ DATABASE_URL: NEON, DIRECT_URL: NEON }, EXPECTED);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("secret-neon-password");
      expect(message).not.toContain(NEON);
      return;
    }
    throw new Error("expected assertion to throw");
  });

  it("parses dotenv without treating comments as values", () => {
    const parsed = guard.parseDotenvContents(
      "# DATABASE_URL=postgresql://ignored\nexport DIRECT_URL=postgresql://127.0.0.1:55432/phase4\n",
    );
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.DIRECT_URL).toBe("postgresql://127.0.0.1:55432/phase4");
  });

  it("does not claim Prisma physically skips .env", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/phase4-pg-integration.cjs"), "utf8");
    expect(source).not.toMatch(/Prisma (does not|never) (read|load|open) .env/i);
    expect(source).toContain("Environment variables loaded from .env");
    expect(source).toContain("process env wins over");
  });
});
