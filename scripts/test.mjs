import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({entryPoints:['tests/booking.test.ts'],outfile:'.sites-runtime/booking.test.mjs',bundle:true,format:'esm',platform:'node',target:'node24'});
const result=spawnSync(process.execPath,['--test','.sites-runtime/booking.test.mjs'],{stdio:'inherit'});process.exit(result.status||0);
