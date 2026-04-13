/**
 * Error types for API error handling
 */

export interface ApiError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  message?: string;
  instance?: string;
}

export class AppError extends Error implements ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;

  constructor(
    message: string,
    status: number = 500,
    type?: string,
    title?: string,
    detail?: string,
    instance?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type || 'https://api.shop.am/problems/internal-error';
    this.title = title || 'Internal Server Error';
    this.status = status;
    this.detail = detail || message;
    this.instance = instance;
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error has ApiError shape
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'type' in error || 'title' in error)
  );
}

/**
 * Convert unknown error to ApiError format
 */
export function toApiError(error: unknown, instance?: string): ApiError {
  if (isAppError(error)) {
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      instance: error.instance || instance,
    };
  }

  if (isApiError(error)) {
    return {
      ...error,
      instance: error.instance || instance,
    };
  }

  if (error instanceof Error) {
    return {
      type: 'https://api.shop.am/problems/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: error.message || 'An error occurred',
      instance,
    };
  }

  return {
    type: 'https://api.shop.am/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unknown error occurred',
    instance,
  };
}




