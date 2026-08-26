import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

function readUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

describe("Phase 4 ledger writers contract", () => {
  it("keeps reservation-only operations off the stock ledger", () => {
    const source = readUtf8(path.join(REPO_ROOT, "src/lib/services/inventory/stock-reservation.ts"));
    expect(source).not.toMatch(/stockMovement\.(create|createMany)/);
    expect(source).not.toMatch(/auditLog\.(create|createMany)/);
  });

  it("writes StockMovement from checkout, cancel, and admin adjustment", () => {
    const checkout = readUtf8(
      path.join(REPO_ROOT, "src/lib/services/inventory/decrement-checkout-stock.ts"),
    );
    const cancel = readUtf8(path.join(REPO_ROOT, "src/lib/services/inventory/cancel-restock.ts"));
    const adjust = readUtf8(
      path.join(REPO_ROOT, "src/lib/services/inventory/adjust-variant-stock.ts"),
    );
    expect(checkout).toContain("createStockMovement");
    expect(cancel).toContain("createStockMovement");
    expect(adjust).toContain("createStockMovement");
    expect(adjust).toContain("createAuditLog");
  });

  it("writes Phase 5 idempotency and Phase 6 outbox during checkout", () => {
    const callback = readUtf8(path.join(REPO_ROOT, "src/lib/services/orders/apply-payment-callback.ts"));
    const checkout = readUtf8(path.join(REPO_ROOT, "src/lib/services/orders.service.ts"));
    expect(callback).toContain("providerEventId");
    expect(checkout).toContain("idempotencyScopeHash");
    expect(checkout).toContain("requestFingerprint");
    expect(checkout).toContain("enqueueAparikCheckoutOutbox");
    expect(checkout).not.toContain("sendAparikCheckoutEmail");
    expect(checkout).not.toContain("model Outbox");
    expect(callback).not.toContain("model Outbox");
  });

  it("does not serialize the whole checkout transaction with an advisory xact lock", () => {
    const checkout = readUtf8(path.join(REPO_ROOT, "src/lib/services/orders.service.ts"));
    const allocate = readUtf8(
      path.join(REPO_ROOT, "src/lib/services/orders/allocate-order-number.ts"),
    );
    expect(checkout).not.toContain("pg_advisory_xact_lock");
    expect(allocate).not.toContain("pg_advisory_xact_lock");
    expect(allocate).toContain("createOrderWithUniqueNumber");
  });
});
