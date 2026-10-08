import { build } from 'vite';
import { rmSync } from 'node:fs';

async function main() {
  const outDir = '.test_collab_out';
  try {
    await build({
      logLevel: 'warn',
      build: {
        ssr: 'scripts/test-collaborative-workspace.ts',
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          output: { entryFileNames: 'test.mjs' },
        },
      },
    });

    await import('../.test_collab_out/test.mjs');
  } finally {
    try {
      rmSync(outDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
