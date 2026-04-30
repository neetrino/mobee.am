import { describe, expect, it } from "vitest";
import {
  safeParseAddressCreate,
  safeParseAddressUpdate,
  safeParseProfileUpdate,
} from "./users.schema";

describe("users.schema", () => {
  it("parses valid profile update payload", () => {
    const parsed = safeParseProfileUpdate({
      firstName: "John",
      lastName: "Doe",
      locale: "en",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown profile fields", () => {
    const parsed = safeParseProfileUpdate({
      firstName: "John",
      email: "user@example.com",
    });

    expect(parsed.success).toBe(false);
  });

  it("parses valid address create payload", () => {
    const parsed = safeParseAddressCreate({
      addressLine1: "12 Main St",
      city: "Yerevan",
      countryCode: "am",
      phone: "+37499123456",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.countryCode).toBe("AM");
    }
  });

  it("rejects invalid address create payload", () => {
    const parsed = safeParseAddressCreate({
      city: "Yerevan",
      countryCode: "ARM",
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one field for address update", () => {
    const parsed = safeParseAddressUpdate({});
    expect(parsed.success).toBe(false);
  });
});
