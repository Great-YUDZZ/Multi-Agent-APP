import { build } from 'vite';
import { rmSync } from 'node:fs';

async function main() {
  const outDir = '.test_out';
  try {
    await build({
      logLevel: 'warn',
      build: {
        ssr: 'src/tests/test_obsidian_agent_integration.ts',
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          output: { entryFileNames: 'test.mjs' },
        },
      },
    });

    await import('../.test_out/test.mjs');
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
