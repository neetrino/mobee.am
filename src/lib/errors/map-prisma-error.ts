import { Prisma } from "@white-shop/db";
import { AppError } from "./app-error";
import { ERROR_CODES, PUBLIC_DETAILS } from "./error-codes";
import type { MappedRouteError } from "./error.types";

const UNAVAILABLE_PRISMA_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1008",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

type NamedError = { name?: string; code?: string; message?: string };

function asNamedError(error: unknown): NamedError | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  return error as NamedError;
}

function prismaUnavailable(logMessage: string): MappedRouteError {
  return {
    type: AppError.databaseUnavailable().type,
    title: AppError.databaseUnavailable().title,
    status: 503,
    detail: PUBLIC_DETAILS.DATABASE,
    code: ERROR_CODES.DATABASE_UNAVAILABLE,
    logMessage,
  };
}

function isPrismaCtor(value: unknown): value is new (...args: never[]) => Error {
  return typeof value === "function";
}

function isPrismaError(
  error: unknown,
  ctor: unknown,
  name: string,
): boolean {
  if (isPrismaCtor(ctor) && error instanceof ctor) {
    return true;
  }
  return asNamedError(error)?.name === name;
}

function isInitializationError(error: unknown): boolean {
  return (
    isPrismaError(error, Prisma.PrismaClientInitializationError, "PrismaClientInitializationError") ||
    isPrismaError(error, Prisma.PrismaClientRustPanicError, "PrismaClientRustPanicError")
  );
}

/**
 * Maps Prisma errors by class and `code`, not by leaking `error.message`.
 */
export function mapPrismaError(error: unknown): MappedRouteError | null {
  if (isInitializationError(error)) {
    return prismaUnavailable("Prisma initialization or panic");
  }

  if (
    isPrismaError(error, Prisma.PrismaClientKnownRequestError, "PrismaClientKnownRequestError")
  ) {
    const code = asNamedError(error)?.code;
    if (code && UNAVAILABLE_PRISMA_CODES.has(code)) {
      return prismaUnavailable(`Prisma unavailable (${code})`);
    }
    if (code === "P2025") {
      return {
        type: AppError.notFound().type,
        title: AppError.notFound().title,
        status: 404,
        detail: PUBLIC_DETAILS.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        logMessage: "Prisma record not found",
      };
    }
    if (code === "P2002") {
      return {
        type: AppError.conflict().type,
        title: AppError.conflict().title,
        status: 409,
        detail: PUBLIC_DETAILS.CONFLICT,
        code: ERROR_CODES.CONFLICT,
        logMessage: "Prisma unique constraint",
      };
    }
    return {
      type: AppError.internal().type,
      title: AppError.internal().title,
      status: 500,
      detail: PUBLIC_DETAILS.INTERNAL,
      code: ERROR_CODES.INTERNAL_ERROR,
      logMessage: `Prisma known request error (${code ?? "unknown"})`,
    };
  }

  if (
    isPrismaError(error, Prisma.PrismaClientUnknownRequestError, "PrismaClientUnknownRequestError")
  ) {
    return {
      type: AppError.internal().type,
      title: AppError.internal().title,
      status: 500,
      detail: PUBLIC_DETAILS.INTERNAL,
      code: ERROR_CODES.INTERNAL_ERROR,
      logMessage: "Prisma unknown request error",
    };
  }

  if (
    isPrismaError(error, Prisma.PrismaClientValidationError, "PrismaClientValidationError")
  ) {
    return {
      type: AppError.internal().type,
      title: AppError.internal().title,
      status: 500,
      detail: PUBLIC_DETAILS.INTERNAL,
      code: ERROR_CODES.INTERNAL_ERROR,
      logMessage: "Prisma validation error",
    };
  }

  return null;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const mapped = mapPrismaError(error);
  return mapped?.code === ERROR_CODES.DATABASE_UNAVAILABLE;
}
