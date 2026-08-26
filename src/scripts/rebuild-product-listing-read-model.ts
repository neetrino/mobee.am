import { loadRootEnv, silencePrismaQueryLogsForCli } from "./load-root-env";

loadRootEnv();
silencePrismaQueryLogsForCli();

async function main(): Promise<void> {
  const { rebuildProductListingReadModel } = await import(
    "@/lib/read-model/product-read-model-sync"
  );
  const started = Date.now();
  await rebuildProductListingReadModel();
  process.stdout.write(`Rebuilt listing + PDP read models in ${Date.now() - started}ms\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
