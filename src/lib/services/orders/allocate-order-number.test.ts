import { describe, expect, it, vi } from "vitest";
import {
  ORDER_NUMBER_ALLOCATE_ATTEMPTS,
  ORDER_NUMBER_START,
  createOrderWithUniqueNumber,
  isOrderNumberUniqueConflict,
  peekNextNumericOrderNumber,
} from "./allocate-order-number";

function uniqueConflict(target: string[] | string = ["number"]) {
  return { code: "P2002", meta: { target } };
}

describe("isOrderNumberUniqueConflict", () => {
  it("accepts P2002 on the number field only", () => {
    expect(isOrderNumberUniqueConflict(uniqueConflict(["number"]))).toBe(true);
    expect(isOrderNumberUniqueConflict(uniqueConflict("orders_number_key"))).toBe(true);
    expect(isOrderNumberUniqueConflict(uniqueConflict(["email"]))).toBe(false);
    expect(isOrderNumberUniqueConflict({ code: "P2002" })).toBe(false);
    expect(
      isOrderNumberUniqueConflict({
        code: "P2002",
        message: "Unique constraint failed on the fields: (`number`)",
      }),
    ).toBe(true);
    expect(isOrderNumberUniqueConflict({ code: "P2025", meta: { target: ["number"] } })).toBe(
      false,
    );
  });
});

describe("peekNextNumericOrderNumber", () => {
  it("returns 1000 when the table has no numeric numbers", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ max: null }]),
    };
    await expect(peekNextNumericOrderNumber(tx as never)).resolves.toBe(String(ORDER_NUMBER_START));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("does not issue an advisory lock", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([{ max: 1042n }]),
    };
    await expect(peekNextNumericOrderNumber(tx as never)).resolves.toBe("1043");
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});

describe("createOrderWithUniqueNumber", () => {
  it("retries bounded P2002 on number after rolling back the savepoint", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(uniqueConflict())
      .mockRejectedValueOnce(uniqueConflict())
      .mockResolvedValueOnce({ id: "order-1", number: "1002" });
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ max: 1000n }])
        .mockResolvedValueOnce([{ max: 1001n }])
        .mockResolvedValueOnce([{ max: 1001n }]),
    };

    await expect(createOrderWithUniqueNumber(tx as never, create)).resolves.toEqual({
      id: "order-1",
      number: "1002",
    });
    expect(create).toHaveBeenCalledTimes(3);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(create).toHaveBeenNthCalledWith(1, "1001");
    expect(create).toHaveBeenNthCalledWith(2, "1002");
  });

  it("stops after the named attempt limit", async () => {
    const create = vi.fn().mockRejectedValue(uniqueConflict());
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ max: 1000n }]),
    };

    await expect(createOrderWithUniqueNumber(tx as never, create)).rejects.toMatchObject({
      code: "P2002",
    });
    expect(create).toHaveBeenCalledTimes(ORDER_NUMBER_ALLOCATE_ATTEMPTS);
  });

  it("does not retry an unrelated unique conflict", async () => {
    const create = vi.fn().mockRejectedValue(uniqueConflict(["email"]));
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([{ max: 1000n }]),
    };

    await expect(createOrderWithUniqueNumber(tx as never, create)).rejects.toMatchObject({
      code: "P2002",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
