import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "./generated/client";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Node < 17
}

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

// Ensure UTF-8 encoding for PostgreSQL connection
// This fixes encoding issues with Armenian and other UTF-8 characters
const databaseUrl = process.env.DATABASE_URL || "";
let urlWithEncoding = databaseUrl;

if (!databaseUrl.includes("client_encoding")) {
  urlWithEncoding = databaseUrl.includes("?")
    ? `${databaseUrl}&client_encoding=UTF8`
    : `${databaseUrl}?client_encoding=UTF8`;

  // Temporarily override DATABASE_URL for Prisma Client
  process.env.DATABASE_URL = urlWithEncoding;
}

const PRISMA_LOG_DEV: Array<"query" | "error" | "warn"> = ["query", "error", "warn"];
const PRISMA_LOG_PROD: Array<"error"> = ["error"];

const PRISMA_CLIENT_OPTIONS = {
  log: process.env.NODE_ENV === "development" ? PRISMA_LOG_DEV : PRISMA_LOG_PROD,
  errorFormat: "pretty" as const,
};

/**
 * After `prisma generate`, Next.js HMR can keep a stale global PrismaClient
 * that is missing newly added delegates (e.g. productListingRow).
 */
function isCurrentPrismaClient(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) {
    return false;
  }
  return (
    typeof client.productListingRow?.count === "function" &&
    typeof client.productPdpRow?.count === "function"
  );
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient(PRISMA_CLIENT_OPTIONS);
}

export const db = isCurrentPrismaClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient();

// Prisma Client connects automatically on first query (lazy connection)
// No need to call $connect() explicitly as it can cause issues in Next.js API routes
// Connection will be established automatically when the first database query is made

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
