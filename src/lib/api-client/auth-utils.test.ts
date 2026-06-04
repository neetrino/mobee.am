import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyAuthStorage,
  getAuthToken,
  isValidStoredAuthToken,
} from "./auth-utils";

const VALID_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxIn0.signature";

function createStorage(initial: Record<string, string>): Storage {
  const store = new Map(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function stubBrowserStorage(initial: Record<string, string>): Storage {
  const storage = createStorage(initial);
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("auth-utils", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAuthToken always returns null (cookie session)", () => {
    stubBrowserStorage({
      auth_token: VALID_TOKEN,
      auth_user: JSON.stringify({ id: "user-1" }),
    });

    expect(getAuthToken()).toBeNull();
  });

  it("clearLegacyAuthStorage removes legacy keys", () => {
    const storage = stubBrowserStorage({
      auth_token: VALID_TOKEN,
      auth_user: JSON.stringify({ id: "user-1" }),
    });

    clearLegacyAuthStorage();
    expect(storage.getItem("auth_token")).toBeNull();
    expect(storage.getItem("auth_user")).toBeNull();
  });

  it("validates only compact JWT token strings", () => {
    expect(isValidStoredAuthToken(VALID_TOKEN)).toBe(true);
    expect(isValidStoredAuthToken("Bearer token")).toBe(false);
  });
});
