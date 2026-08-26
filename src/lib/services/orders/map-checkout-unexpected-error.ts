import { ERROR_CODES, PUBLIC_DETAILS, publicDetailForServerError } from "@/lib/errors/error-codes";
import { logger } from "@/lib/utils/logger";
import { redactLogContext } from "@/lib/utils/redact";
import { isOrderNumberUniqueConflict } from "./allocate-order-number";

const PRISMA_UNIQUE_CODE = "P2002";
const CHECKOUT_OPERATION = "checkout";
const CHECKOUT_CONFLICT_TYPE = "https://api.shop.am/problems/conflict";
const CHECKOUT_INTERNAL_TYPE = "https://api.shop.am/problems/internal-error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCheckoutDomainError(error: unknown): boolean {
  return isRecord(error) && typeof error.status === "number" && typeof error.type === "string";
}

function readErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  if (isRecord(error) && typeof error.name === "string" && error.name.length > 0) {
    return error.name;
  }
  return "Error";
}

function readSafePrismaCode(error: unknown): string | null {
  if (!isRecord(error) || typeof error.code !== "string") {
    return null;
  }
  return /^P\d{4}$/.test(error.code) ? error.code : null;
}

function readErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }
  return undefined;
}

function logCheckoutFailure(error: unknown, requestId: string): void {
  const production = process.env.NODE_ENV === "production";
  const safe = {
    requestId,
    errorName: readErrorName(error),
    errorCode: readSafePrismaCode(error),
    operation: CHECKOUT_OPERATION,
  };

  if (production) {
    logger.error("Checkout failed", safe);
    return;
  }

  logger.error(
    "Checkout failed",
    redactLogContext({
      ...safe,
      errorMessage: readErrorMessage(error),
    }),
  );
}

/**
 * Maps unexpected checkout failures. Production logs never include Prisma SQL,
 * stack, connection strings, or raw Error.message. 5xx detail is public-only.
 */
export function throwMappedCheckoutFailure(error: unknown, requestId: string): never {
  if (isCheckoutDomainError(error)) {
    throw error;
  }

  logCheckoutFailure(error, requestId);

  if (readSafePrismaCode(error) === PRISMA_UNIQUE_CODE) {
    if (isOrderNumberUniqueConflict(error)) {
      throw {
        status: 409,
        type: CHECKOUT_CONFLICT_TYPE,
        title: "Conflict",
        detail: "Order number already exists, please try again",
      };
    }
    throw {
      status: 409,
      type: CHECKOUT_CONFLICT_TYPE,
      title: "Conflict",
      detail: "Checkout request conflict, please retry",
    };
  }

  throw {
    status: 500,
    type: CHECKOUT_INTERNAL_TYPE,
    title: "Internal Server Error",
    detail: publicDetailForServerError(500, ERROR_CODES.INTERNAL_ERROR),
  };
}

export const CHECKOUT_PUBLIC_INTERNAL_DETAIL = PUBLIC_DETAILS.INTERNAL;
