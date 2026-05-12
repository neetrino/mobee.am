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

  it("parses profile update with email and phone", () => {
    const parsed = safeParseProfileUpdate({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+37499123456",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("jane@example.com");
      expect(parsed.data.phone).toBe("+37499123456");
    }
  });

  it("rejects unknown profile fields", () => {
    const parsed = safeParseProfileUpdate({
      firstName: "John",
      nickname: "JD",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid profile email", () => {
    const parsed = safeParseProfileUpdate({
      firstName: "John",
      email: "not-an-email",
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

  it("accepts address create with empty optional string fields (profile form payload)", () => {
    const parsed = safeParseAddressCreate({
      firstName: "",
      lastName: "",
      company: "",
      addressLine1: "12 Main St",
      addressLine2: "",
      city: "Yerevan",
      state: "",
      postalCode: "",
      countryCode: "AM",
      phone: "",
      isDefault: false,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.firstName).toBeUndefined();
      expect(parsed.data.phone).toBeUndefined();
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
