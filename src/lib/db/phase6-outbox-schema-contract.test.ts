import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCHEMA_PATH = path.join(REPO_ROOT, "shared/db/prisma/schema.prisma");
const PHASE3_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "shared/db/prisma/migrations/20260825120000_phase3_ledger_audit_idempotency_foundation/migration.sql",
);
const PHASE6_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "shared/db/prisma/migrations/20260826120000_phase6_outbox_foundation/migration.sql",
);

function readUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("Phase 6 outbox schema contract", () => {
  const schema = readUtf8(SCHEMA_PATH);
  const phase3Migration = readUtf8(PHASE3_MIGRATION_PATH);
  const phase6Migration = readUtf8(PHASE6_MIGRATION_PATH);

  it("adds OutboxEvent with processingAt and dedupe unique", () => {
    expect(schema).toContain("model OutboxEvent");
    expect(schema).toContain("processingAt");
    expect(schema).toContain('map: "outbox_events_dedupe_uidx"');
    expect(schema).not.toMatch(/enum\s+OutboxStatus/);
  });

  it("creates outbox_events with lowercase status CHECK and no PG enum type", () => {
    expect(phase6Migration).toContain('CREATE TABLE "outbox_events"');
    expect(phase6Migration).toContain("outbox_events_status_check");
    expect(phase6Migration).toContain("'pending', 'processing', 'completed', 'failed'");
    expect(phase6Migration).toContain("outbox_events_dedupe_uidx");
    expect(phase6Migration).toContain("outbox_events_attempt_count_non_negative_check");
    expect(phase6Migration).toContain("outbox_events_payload_version_positive_check");
    expect(phase6Migration).not.toContain("CREATE TYPE");
  });

  it("does not modify the Phase 3 migration file", () => {
    expect(phase3Migration).not.toContain('CREATE TABLE "outbox_events"');
    expect(phase3Migration).toContain("No Outbox");
  });
});
