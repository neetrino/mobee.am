import {
  codeFromStatus,
  ERROR_CODES,
  problemType,
  PUBLIC_DETAILS,
  titleForStatus,
  type ErrorCode,
} from "./error-codes";
import type { ApiError } from "./error.types";

type AppErrorInit = {
  code: ErrorCode;
  status: number;
  detail: string;
  title?: string;
  type?: string;
};

export class AppError extends Error implements ApiError {
  readonly name = "AppError";
  readonly code: ErrorCode;
  readonly status: number;
  readonly title: string;
  readonly type: string;
  readonly detail: string;

  constructor(init: AppErrorInit) {
    super(init.detail);
    this.code = init.code;
    this.status = init.status;
    this.title = init.title ?? titleForStatus(init.status);
    this.type = init.type ?? problemType(init.code);
    this.detail = init.detail;
  }

  static badRequest(detail: string): AppError {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      detail,
    });
  }

  static unauthorized(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.UNAUTHORIZED,
      status: 401,
      detail: detail ?? PUBLIC_DETAILS.UNAUTHORIZED,
    });
  }

  static forbidden(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.FORBIDDEN,
      status: 403,
      detail: detail ?? PUBLIC_DETAILS.FORBIDDEN,
    });
  }

  static notFound(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.NOT_FOUND,
      status: 404,
      detail: detail ?? PUBLIC_DETAILS.NOT_FOUND,
    });
  }

  static conflict(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.CONFLICT,
      status: 409,
      detail: detail ?? PUBLIC_DETAILS.CONFLICT,
    });
  }

  static tooManyRequests(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.RATE_LIMITED,
      status: 429,
      detail: detail ?? PUBLIC_DETAILS.RATE_LIMITED,
    });
  }

  static methodNotAllowed(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.METHOD_NOT_ALLOWED,
      status: 405,
      detail: detail ?? PUBLIC_DETAILS.METHOD_NOT_ALLOWED,
    });
  }

  static databaseUnavailable(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.DATABASE_UNAVAILABLE,
      status: 503,
      detail: detail ?? PUBLIC_DETAILS.DATABASE,
    });
  }

  static providerFailure(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.PROVIDER_FAILURE,
      status: 502,
      detail: detail ?? PUBLIC_DETAILS.PROVIDER,
    });
  }

  static serviceUnavailable(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
      detail: detail ?? PUBLIC_DETAILS.UNAVAILABLE,
    });
  }

  static internal(detail?: string): AppError {
    return new AppError({
      code: ERROR_CODES.INTERNAL_ERROR,
      status: 500,
      detail: detail ?? PUBLIC_DETAILS.INTERNAL,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && ("status" in error || "type" in error);
}

export function codeForAppError(error: AppError): ErrorCode {
  return error.code || codeFromStatus(error.status);
}
