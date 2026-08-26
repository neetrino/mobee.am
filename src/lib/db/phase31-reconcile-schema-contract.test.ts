import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCHEMA_PATH = path.join(REPO_ROOT, "shared/db/prisma/schema.prisma");
const RECONCILE_PATH = path.join(
  REPO_ROOT,
  "shared/db/prisma/migrations/20260825180000_phase3_reconcile_migration_history/migration.sql",
);
const PHASE3_PATH = path.join(
  REPO_ROOT,
  "shared/db/prisma/migrations/20260825120000_phase3_ledger_audit_idempotency_foundation/migration.sql",
);

function readUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("Phase 3.1 reconciliation contract", () => {
  const schema = readUtf8(SCHEMA_PATH);
  const reconcile = readUtf8(RECONCILE_PATH);
  const phase3 = readUtf8(PHASE3_PATH);

  it("is a separate follow-up migration and does not rewrite Phase 3 SQL", () => {
    expect(phase3).toContain("CREATE TABLE \"stock_movements\"");
    expect(phase3).not.toContain("CREATE TABLE \"product_reviews\"");
    expect(reconcile).toContain("CREATE TABLE IF NOT EXISTS \"product_reviews\"");
    expect(reconcile).not.toContain("CREATE TABLE \"stock_movements\"");
  });

  it("adds ProductReview, ContactMessage, and password-reset columns from schema", () => {
    expect(schema).toContain("@@map(\"product_reviews\")");
    expect(schema).toContain("@@map(\"contact_messages\")");
    expect(schema).toContain("passwordResetToken");
    expect(schema).toContain("passwordResetExpires");
    expect(reconcile).toContain("CREATE TABLE IF NOT EXISTS \"contact_messages\"");
    expect(reconcile).toContain("passwordResetToken");
    expect(reconcile).toContain("passwordResetExpires");
    expect(reconcile).toContain("product_reviews_productId_userId_key");
  });

  it("renames stock_reserved only when that is the sole column and aborts on mismatch", () => {
    expect(schema).toContain("stockReserved");
    expect(reconcile).toContain('RENAME COLUMN "stock_reserved" TO "stockReserved"');
    expect(reconcile).toContain("mismatched row(s)");
    expect(reconcile).toContain('CHECK ("stockReserved" >= 0)');
    expect(reconcile).toContain('CHECK ("stockReserved" <= "stock")');
    expect(reconcile).not.toMatch(/DROP COLUMN IF EXISTS "stock_reserved"/);
  });

  it("does not drop documented legacy extras", () => {
    expect(reconcile).not.toMatch(/DROP COLUMN .*colorHex/);
    expect(reconcile).not.toContain("DROP INDEX \"attribute_values_colors_idx\"");
    expect(reconcile).not.toContain("DROP INDEX \"products_categoryIds_gin_idx\"");
  });
});
