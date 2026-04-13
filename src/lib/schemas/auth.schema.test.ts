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

    it("parses valid login with phone", () => {
      const body = { phone: "+123", password: "secret" };
      expect(parseLoginBody(body)).toEqual(body);
      expect(safeParseLogin(body).success).toBe(true);
    });

    it("rejects missing email and phone", () => {
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
    it("parses valid register with email", () => {
      const body = {
        email: "u@x.com",
        password: "123456",
        firstName: "A",
        lastName: "B",
      };
      expect(parseRegisterBody(body)).toEqual(body);
      expect(safeParseRegister(body).success).toBe(true);
    });

    it("parses valid register with phone", () => {
      const body = { phone: "+123", password: "123456" };
      expect(parseRegisterBody(body)).toEqual(body);
    });

    it("rejects password shorter than 6", () => {
      const body = { email: "u@x.com", password: "12345" };
      expect(() => parseRegisterBody(body)).toThrow();
      expect(safeParseRegister(body).success).toBe(false);
    });

    it("rejects when neither email nor phone", () => {
      const body = { password: "123456" };
      expect(() => parseRegisterBody(body)).toThrow();
    });
  });
});
