import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCHEMA_PATH = path.join(REPO_ROOT, "shared/db/prisma/schema.prisma");
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "shared/db/prisma/migrations/20260825120000_phase3_ledger_audit_idempotency_foundation/migration.sql",
);

function readUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("Phase 3 schema contract", () => {
  const schema = readUtf8(SCHEMA_PATH);
  const migration = readUtf8(MIGRATION_PATH);

  it("adds variant-level stock ledger with snapshot and SetNull", () => {
    expect(schema).toContain("@@map(\"stock_movements\")");
    expect(schema).toContain("variantIdSnapshot");
    expect(schema).toContain("onDelete: SetNull");
    expect(migration).toContain("CREATE TABLE \"stock_movements\"");
    expect(migration).toContain(
      'FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")',
    );
    expect(migration).toMatch(
      /stock_movements_variantId_fkey[\s\S]*ON DELETE SET NULL/,
    );
    expect(migration).not.toMatch(
      /stock_movements_variantId_fkey[\s\S]*ON DELETE RESTRICT/,
    );
  });

  it("enforces StockMovement reason via SQL CHECK, not a Prisma enum", () => {
    expect(schema).not.toMatch(/enum\s+StockMovementReason/);
    expect(migration).toContain("stock_movements_reason_check");
    expect(migration).toContain("'order', 'cancel', 'return', 'admin_adjustment', 'import'");
    expect(migration).toContain("stock_movements_delta_nonzero_check");
    expect(migration).toContain("stock_movements_resulting_balance_non_negative_check");
  });

  it("keeps idempotency uniqueness on scope+key and excludes fingerprint", () => {
    expect(schema).toContain("idempotencyScopeHash");
    expect(schema).toContain("idempotencyKeyHash");
    expect(schema).toContain("requestFingerprint");
    expect(schema).not.toMatch(/@@unique\(\[idempotencyScopeHash,\s*idempotencyKeyHash,\s*requestFingerprint\]/);
    expect(migration).toContain("orders_idempotency_scope_key_uidx");
    expect(migration).toContain(
      'ON "orders"("idempotencyScopeHash", "idempotencyKeyHash")',
    );
    expect(migration).toContain('"idempotencyScopeHash" IS NOT NULL');
    expect(migration).toContain('"idempotencyKeyHash" IS NOT NULL');
    expect(migration).not.toMatch(
      /UNIQUE INDEX "orders_idempotency[\s\S]*requestFingerprint/,
    );
  });

  it("scopes provider replay uniqueness to provider + providerEventId", () => {
    expect(schema).toContain("providerEventId");
    expect(migration).toContain("order_events_provider_providerEventId_uidx");
    expect(migration).toContain(
      'ON "order_events"("provider", "providerEventId")',
    );
    expect(migration).toContain('"provider" IS NOT NULL');
    expect(migration).toContain('"providerEventId" IS NOT NULL');
    expect(migration).not.toMatch(
      /UNIQUE INDEX "order_events_providerEventId_uidx"\s+ON "order_events"\("providerEventId"\)/,
    );
  });

  it("does not add unique on Payment.providerTransactionId or Outbox", () => {
    expect(schema).not.toContain("model Outbox");
    expect(schema).not.toContain('@@map("outbox');
    expect(migration).not.toContain('CREATE TABLE "outbox');
    expect(migration).not.toMatch(
      /UNIQUE INDEX .*payments.*providerTransactionId/,
    );
  });

  it("declares explicit reverse relations on User, ProductVariant, and Order", () => {
    expect(schema).toContain('@relation("StockMovementActor")');
    expect(schema).toContain('@relation("AuditLogActor")');
    expect(schema).toContain('@relation("OrderEventActor")');
    expect(schema).toContain('@relation("StockMovementVariant")');
    expect(schema).toContain('@relation("StockMovementOrder")');
  });

  it("does not introduce Phase 5 idempotency writers", () => {
    const writerPaths = [
      "src/lib/services/orders.service.ts",
      "src/lib/services/admin/admin-orders/order-mutations.ts",
      "src/lib/services/admin/admin-inventory.service.ts",
      "src/lib/services/inventory/stock-reservation.ts",
      "src/app/api/v1/payments/callback/route.ts",
    ];

    for (const relativePath of writerPaths) {
      const source = readUtf8(path.join(REPO_ROOT, relativePath));
      expect(source).not.toContain("idempotencyScopeHash");
      expect(source).not.toContain("providerEventId");
    }
  });
});
