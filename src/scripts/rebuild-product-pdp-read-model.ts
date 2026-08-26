import { loadRootEnv, silencePrismaQueryLogsForCli } from "./load-root-env";

loadRootEnv();
silencePrismaQueryLogsForCli();

async function main(): Promise<void> {
  const { rebuildProductPdpReadModel } = await import(
    "@/lib/read-model/product-pdp-read-model-sync"
  );
  const { invalidateProductReadCaches } = await import(
    "@/lib/services/read-through-json-cache"
  );
  const started = Date.now();
  await rebuildProductPdpReadModel();
  await invalidateProductReadCaches();
  process.stdout.write(`Rebuilt PDP read model in ${Date.now() - started}ms\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
