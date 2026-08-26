# Prisma Migrations Rollout and Health

## Purpose
This document tracks migration rollout expectations and health verification flow per environment.

## Rollout Status
- Development: migration files exist and are expected to be applied locally via `prisma migrate dev` or `prisma migrate deploy`.
- CI: migrations are applied to ephemeral PostgreSQL and verified with `prisma migrate status`.
- Staging: rollout status is environment-dependent; verify before release.
- Production: rollout status is environment-dependent; verify during deploy and post-deploy checks.

## Commands
- Apply migrations: `pnpm run db:migrate:deploy`
- Health verification: `pnpm run db:migrate:health`

## CI Verification
CI workflow runs the following on a test PostgreSQL service:
1. `pnpm run db:migrate:deploy`
2. `pnpm run db:migrate:health`

The second command fails the pipeline if migration state is not healthy.

## Local Verification
1. Ensure `.env` includes `DATABASE_URL` (and optionally `DIRECT_URL`).
2. Run:
   - `pnpm run db:migrate:deploy`
   - `pnpm run db:migrate:health`

## Notes
- Migration health check uses Prisma's canonical status command (`prisma migrate status`).
- Keep this document updated when rollout policy or environments change.

## Phase 3 foundation (20260825120000)

Expand-only schema for stock ledger, audit log, checkout idempotency hashes, and OrderEvent provider replay.

- `stock_movements` is variant-level. `variantId` is nullable `ON DELETE SET NULL` plus `variantIdSnapshot` / `skuSnapshot` so admin hard-delete of variants does not drop ledger rows.
- `reason` is `TEXT` with SQL CHECK (`order`, `cancel`, `return`, `admin_adjustment`, `import`). Prisma 5 cannot model CHECK constraints.
- `audit_logs` is created empty. Application writers are not wired in this phase.
- `orders.idempotencyScopeHash` + `orders.idempotencyKeyHash` use a **partial unique** index. `requestFingerprint` is stored but is **not** part of uniqueness.
- `order_events.provider` + `order_events.providerEventId` use a **partial unique** index so Idram and Arca cannot collide on the same event id.
- `payments.providerTransactionId` is unchanged (no unique).
- Partial unique indexes are SQL-only (same pattern as `product_variants_source_sourcePid_key`). Do not `db push`. Later `migrate diff` may report these indexes as extra in the database; do not drop them.
- Old application versions remain compatible: new columns are nullable or have defaults; new tables are unused.
- Do not apply this migration to shared Neon from local tools. Apply via the project deploy/CI path against a disposable or explicitly approved database.

## Phase 3.1 reconciliation (20260825180000)

Fresh `migrate deploy` of pre-Phase-3 history did not match the current Prisma schema (objects added via schema/db-push never landed in SQL migrations). This expand-only follow-up does not rewrite `20260825120000`.

Adds:

- `product_reviews` (indexes, unique `(productId, userId)`, FKs CASCADE)
- `contact_messages` (indexes)
- `users.passwordResetToken` / `users.passwordResetExpires` (nullable)
- `product_variant_options_valueId_idx` and `valueId` FK `ON DELETE SET NULL` (aborts if orphan `valueId` rows exist)
- non-partial `products_primaryCategoryId_idx` (partial `WHERE deletedAt IS NULL` is renamed, not dropped)
- `product_variants.stockReserved` via rename from `stock_reserved` when that is the only column; aborts if both columns exist with mismatched values
- CHECKs `stockReserved >= 0` and `stockReserved <= stock`
- non-partial `product_variants_stock_published_idx` (partial `WHERE published = true` is renamed, not dropped)

Intentionally retained extras (do not drop for a clean diff):

- `attribute_values.colorHex`
- `attribute_values_colors_idx` (GIN)
- `products_categoryIds_gin_idx` (GIN)
- renamed partial indexes above
- SQL-only CHECKs and partial unique indexes (Phase 3 + `source`/`sourcePid`)

Do not `db push`. Do not apply to shared Neon from local tools.



