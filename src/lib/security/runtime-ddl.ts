/**
 * Runtime DDL (ALTER/CREATE TABLE from app code) is disabled in production
 * unless explicitly opted in. Use `pnpm run db:migrate:deploy` instead.
 */
export function isRuntimeDdlEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const flag = process.env.ALLOW_RUNTIME_DDL?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}
