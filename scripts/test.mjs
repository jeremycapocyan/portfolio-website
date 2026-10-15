import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({entryPoints:['tests/booking.test.ts','tests/vercel.test.ts'],outdir:'.sites-runtime',outExtension:{'.js':'.mjs'},bundle:true,packages:'external',external:['../scripts/migrate-turso.mjs'],format:'esm',platform:'node',target:'node24'});
const result=spawnSync(process.execPath,['--test','.sites-runtime/booking.test.mjs','.sites-runtime/vercel.test.mjs'],{stdio:'inherit'});process.exit(result.status??1);
