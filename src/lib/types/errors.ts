/**
 * Error types for API error handling
 */
export type { ApiError } from "@/lib/errors/error.types";
export { AppError, isAppError, isApiError } from "@/lib/errors/app-error";
export { toApiError } from "@/lib/errors/map-route-error";
