import { describe, it, expect } from "vitest";
import {
  parseLoginBody,
  parseRegisterBody,
  safeParseLogin,
  safeParseRegister,
} from "./auth.schema";

describe("auth.schema", () => {
  describe("login", () => {
    it("parses valid login with email", () => {
      const body = { email: "u@x.com", password: "secret" };
      expect(parseLoginBody(body)).toEqual(body);
      expect(safeParseLogin(body).success).toBe(true);
    });

    it("rejects phone-only login", () => {
      const body = { phone: "+123", password: "secret" };
      expect(() => parseLoginBody(body)).toThrow();
      expect(safeParseLogin(body).success).toBe(false);
    });

    it("rejects invalid email", () => {
      const body = { email: "not-an-email", password: "secret" };
      expect(() => parseLoginBody(body)).toThrow();
      expect(safeParseLogin(body).success).toBe(false);
    });

    it("rejects missing email", () => {
      const body = { password: "secret" };
      expect(() => parseLoginBody(body)).toThrow();
      const result = safeParseLogin(body);
      expect(result.success).toBe(false);
    });

    it("rejects missing password", () => {
      const body = { email: "u@x.com" };
      expect(() => parseLoginBody(body)).toThrow();
    });
  });

  describe("register", () => {
    it("parses valid register with all required fields", () => {
      const body = {
        email: "u@x.com",
        phone: "+37412345678",
        password: "123456",
        firstName: "A",
        lastName: "B",
      };
      expect(parseRegisterBody(body)).toEqual(body);
      expect(safeParseRegister(body).success).toBe(true);
    });

    it("rejects when phone is missing", () => {
      const body = {
        email: "u@x.com",
        password: "123456",
        firstName: "A",
        lastName: "B",
      };
      expect(safeParseRegister(body).success).toBe(false);
    });

    it("rejects password shorter than 6", () => {
      const body = {
        email: "u@x.com",
        phone: "+37412345678",
        password: "12345",
        firstName: "A",
        lastName: "B",
      };
      expect(() => parseRegisterBody(body)).toThrow();
      expect(safeParseRegister(body).success).toBe(false);
    });

    it("rejects when email is missing", () => {
      const body = {
        phone: "+37412345678",
        password: "123456",
        firstName: "A",
        lastName: "B",
      };
      expect(() => parseRegisterBody(body)).toThrow();
    });
  });
});
