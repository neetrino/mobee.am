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



