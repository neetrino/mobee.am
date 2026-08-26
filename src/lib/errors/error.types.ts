import type { ErrorCode } from "./error-codes";

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: ErrorCode;
  requestId: string;
  issues?: Array<{ path: string; message: string }>;
}

export interface MappedRouteError {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ErrorCode;
  issues?: Array<{ path: string; message: string }>;
  logMessage?: string;
  logMeta?: Record<string, unknown>;
}

/** Legacy API error shape used by some services. */
export interface ApiError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  message?: string;
  instance?: string;
  code?: string;
}
