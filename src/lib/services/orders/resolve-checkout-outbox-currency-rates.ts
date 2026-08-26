import { getDefaultCurrencyRates } from "@/lib/checkout/checkout-email-money";
import { adminService } from "@/lib/services/admin.service";
import { logger } from "@/lib/utils/logger";

export async function resolveCheckoutOutboxCurrencyRates(): Promise<Record<string, number>> {
  try {
    const settings = await adminService.getSettings();
    return settings.currencyRates ?? getDefaultCurrencyRates();
  } catch (error: unknown) {
    logger.warn("Failed to load checkout outbox currency rates; using defaults", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return getDefaultCurrencyRates();
  }
}
