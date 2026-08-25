/**
 * Client-facing catalog query error (HTTP 400). Safe `detail` only — no internals.
 */
export class CatalogQueryError extends Error {
  readonly status = 400;
  readonly type = "https://api.mobee.am/problems/validation-error";
  readonly title = "Bad Request";
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "CatalogQueryError";
    this.detail = detail;
  }
}

export function isCatalogQueryError(error: unknown): error is CatalogQueryError {
  return error instanceof CatalogQueryError;
}
