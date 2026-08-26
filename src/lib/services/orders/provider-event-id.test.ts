import { describe, expect, it } from "vitest";
import { buildProviderEventId } from "./provider-event-id";

describe("buildProviderEventId", () => {
  it("derives the same stable id for identical callback inputs", () => {
    const first = buildProviderEventId({
      provider: "idram",
      paymentId: "pay-1",
      status: "paid",
      orderNumber: "1001",
    });
    const second = buildProviderEventId({
      provider: "idram",
      paymentId: "pay-1",
      status: "paid",
      orderNumber: "1001",
    });
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  it("scopes replay ids by provider so idram and arca do not collide", () => {
    const idram = buildProviderEventId({
      provider: "idram",
      paymentId: "pay-1",
      status: "paid",
      orderNumber: "1001",
    });
    const arca = buildProviderEventId({
      provider: "arca",
      paymentId: "pay-1",
      status: "paid",
      orderNumber: "1001",
    });
    expect(idram).not.toBe(arca);
  });
});
