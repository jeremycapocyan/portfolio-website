import { createClient } from '@libsql/client';
import { readdirSync,readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function migrate(client){
 await client.execute('CREATE TABLE IF NOT EXISTS _turso_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()){
  const source=readFileSync(new URL(`../drizzle/${name}`,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(source).digest('hex');
  const tx=await client.transaction('write');
  try{
   const existing=await tx.execute({sql:'SELECT checksum FROM _turso_migrations WHERE name=?',args:[name]});
   if(existing.rows.length){if(existing.rows[0].checksum!==checksum)throw new Error(`Migration changed: ${name}`);}
   else{
    for(const sql of source.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await tx.execute(sql);
    await tx.execute({sql:'INSERT INTO _turso_migrations (name,checksum) VALUES (?,?)',args:[name,checksum]});
   }
   await tx.commit();
  }catch(e){await tx.rollback();throw e;}finally{tx.close();}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(existsSync('.env.local'))process.loadEnvFile('.env.local');
 const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
 if(!url||!authToken||!url.startsWith('libsql://'))throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN securely before running migrations.');
 const client=createClient({url,authToken});
 try{await migrate(client);console.log('Turso migrations applied successfully.');}finally{client.close();}
}
