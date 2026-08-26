import { logger } from "@/lib/utils/logger";
import { drainOutboxBatch } from "./drain-outbox";

/** Best-effort post-commit drain; checkout success must not depend on this finishing. */
export function triggerOutboxDrainBestEffort(): void {
  void drainOutboxBatch().catch((error: unknown) => {
    logger.error("Outbox best-effort drain failed", {
      errorName: error instanceof Error ? error.name : "Error",
    });
  });
}
