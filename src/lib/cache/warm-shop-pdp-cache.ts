import { logger } from "@/lib/utils/logger";

/**
 * PDP is served live from the database. Warming a Redis copy would hide catalog writes.
 */
export async function warmShopPdpCache(): Promise<void> {
  logger.info("[warmShopPdpCache] skipped; PDP is served live from DB");
}
