import { describe, expect, it } from "vitest";
import { AppError } from "./app-error";
import { ERROR_CODES, PUBLIC_DETAILS } from "./error-codes";
import { mapRouteError } from "./map-route-error";
import { CatalogQueryError } from "@/lib/catalog/catalog-query-error";
import { z } from "zod";

describe("mapRouteError", () => {
  it("maps validation AppError to 400", () => {
    const mapped = mapRouteError(AppError.badRequest("Invalid sort"));
    expect(mapped.status).toBe(400);
    expect(mapped.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(mapped.detail).toBe("Invalid sort");
  });

  it("maps unauthorized, forbidden, not found, conflict, and rate limit", () => {
    expect(mapRouteError(AppError.unauthorized()).status).toBe(401);
    expect(mapRouteError(AppError.forbidden()).status).toBe(403);
    expect(mapRouteError(AppError.notFound()).status).toBe(404);
    expect(mapRouteError(AppError.conflict()).status).toBe(409);
    expect(mapRouteError(AppError.tooManyRequests()).status).toBe(429);
  });

  it("maps Prisma unavailable by class name to 503 without leaking internals", () => {
    const error = Object.assign(new Error("Can't reach database server at postgres://secret"), {
      name: "PrismaClientInitializationError",
    });
    const mapped = mapRouteError(error);
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe(ERROR_CODES.DATABASE_UNAVAILABLE);
    expect(mapped.detail).not.toContain("postgres://");
    expect(mapped.detail).not.toContain("Can't reach");
  });

  it("maps unique constraint to 409 and missing record to 404", () => {
    const unique = Object.assign(new Error("Unique constraint failed"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    const missing = Object.assign(new Error("Record not found"), {
      name: "PrismaClientKnownRequestError",
      code: "P2025",
    });
    expect(mapRouteError(unique)).toMatchObject({ status: 409, code: ERROR_CODES.CONFLICT });
    expect(mapRouteError(missing)).toMatchObject({ status: 404, code: ERROR_CODES.NOT_FOUND });
  });

  it("maps unknown errors to 500 without the internal message", () => {
    const mapped = mapRouteError(new Error("secret stack boom"));
    expect(mapped.status).toBe(500);
    expect(mapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(mapped.detail).not.toContain("secret");
    expect(mapped.detail).not.toContain("boom");
  });

  it("does not return arbitrary 500/502/503 details", () => {
    expect(
      mapRouteError({ status: 500, detail: "sensitive-provider-body-XYZ" }).detail,
    ).not.toContain("sensitive-provider-body-XYZ");
    expect(mapRouteError({ status: 502, detail: "raw-gateway-html" }).detail).toBe(
      PUBLIC_DETAILS.PROVIDER,
    );
    expect(mapRouteError({ status: 503, detail: "postgres://user:pass@host/db" }).detail).not.toContain(
      "postgres://",
    );
  });

  it("sanitizes legacy { status: 500, detail: error.message }", () => {
    const mapped = mapRouteError({
      status: 500,
      detail: "Invalid `prisma.product.findMany()` invocation",
    });
    expect(mapped.status).toBe(500);
    expect(mapped.detail).toBe(PUBLIC_DETAILS.INTERNAL);
    expect(mapped.detail).not.toContain("prisma");
  });

  it("maps 405 to METHOD_NOT_ALLOWED", () => {
    const mapped = mapRouteError({ status: 405, detail: "Use POST" });
    expect(mapped.status).toBe(405);
    expect(mapped.code).toBe(ERROR_CODES.METHOD_NOT_ALLOWED);
    expect(mapped.detail).toBe("Use POST");
  });

  it("keeps catalog query and zod public details", () => {
    const catalog = mapRouteError(new CatalogQueryError("Invalid sort"));
    expect(catalog.status).toBe(400);
    expect(catalog.detail).toBe("Invalid sort");
    const parsed = z.object({ email: z.string().min(1) }).safeParse({ email: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    const zod = mapRouteError(parsed.error);
    expect(zod.status).toBe(400);
    expect(zod.detail.toLowerCase()).toContain("email");
  });
});
