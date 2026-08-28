import {
  loadRootEnv,
  preferDirectDbUrlForCli,
  silencePrismaQueryLogsForCli,
} from "./load-root-env";

loadRootEnv();
preferDirectDbUrlForCli();
silencePrismaQueryLogsForCli();

async function main(): Promise<void> {
  const productId = process.argv[2];
  const { rebuildProductPdpReadModel, syncProductPdpReadModel } = await import(
    "@/lib/read-model/product-pdp-read-model-sync"
  );
  const { invalidateProductReadCaches } = await import(
    "@/lib/services/read-through-json-cache"
  );
  const started = Date.now();
  if (productId) {
    await syncProductPdpReadModel(productId);
  } else {
    await rebuildProductPdpReadModel();
  }
  await invalidateProductReadCaches();
  process.stdout.write(`Rebuilt PDP read model in ${Date.now() - started}ms\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
