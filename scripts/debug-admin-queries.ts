/**
 * Dev-only admin service timing harness (read-only, no mutations).
 * Usage: pnpm exec tsx scripts/debug-admin-queries.ts
 */

import { performance } from "node:perf_hooks";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadRootEnv(): void {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

interface TimingRow {
  label: string;
  ms: number;
  notes: string;
}

async function timeCall<T>(
  label: string,
  fn: () => Promise<T>,
  notes = "",
): Promise<{ row: TimingRow; result: T }> {
  const started = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - started);
  return { row: { label, ms, notes }, result };
}

async function main(): Promise<void> {
  loadRootEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (set in .env)");
    process.exit(1);
  }

  const { getStats } = await import("../src/lib/services/admin/admin-stats/stats-calculator");
  const { getAnalytics } = await import("../src/lib/services/admin/admin-stats/analytics");
  const { getTopProducts } = await import("../src/lib/services/admin/admin-stats/top-products");
  const { getDashboardBundle } = await import(
    "../src/lib/services/admin/admin-stats/dashboard-bundle"
  );
  const { adminCategoriesService } = await import(
    "../src/lib/services/admin/admin-categories.service"
  );
  const { adminService } = await import("../src/lib/services/admin.service");

  const rows: TimingRow[] = [];

  const stats = await timeCall("stats", () => getStats());
  rows.push(stats.row);

  const dashboard = await timeCall("dashboard-bff", () => getDashboardBundle());
  rows.push(dashboard.row);

  for (const period of ["week", "month", "year"] as const) {
    const analytics = await timeCall(`analytics:${period}`, () => getAnalytics(period));
    rows.push({
      ...analytics.row,
      notes: `orders=${analytics.result.orders.totalOrders}`,
    });
  }

  const categories = await timeCall("categories", () => adminCategoriesService.getCategories());
  rows.push({
    ...categories.row,
    notes: `count=${categories.result.data.length}`,
  });

  const orders = await timeCall("orders:list", () =>
    adminService.getOrders({ page: 1, limit: 20 }),
  );
  rows.push({
    ...orders.row,
    notes: `items=${orders.result.data?.length ?? 0}`,
  });

  const topProducts = await timeCall("top-products", () => getTopProducts(5));
  rows.push({
    ...topProducts.row,
    notes: `items=${topProducts.result.length}`,
  });

  console.log("\n[ADMIN_PERF_BASELINE]");
  for (const row of rows) {
    const noteSuffix = row.notes ? ` notes=${row.notes}` : "";
    console.log(`label=${row.label} ms=${row.ms}${noteSuffix}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { db } = await import("@white-shop/db");
    await db.$disconnect();
  });
