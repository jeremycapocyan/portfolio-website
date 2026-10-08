import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { build } from 'esbuild';
import { database } from './sqlite.mjs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['worker/api.ts'],outfile:'.sites-runtime/api.mjs',bundle:true,format:'esm',platform:'node',target:'node24'});
const {handleApi}=await import('../.sites-runtime/api.mjs');
const DB=database('.sites-runtime/bookings.sqlite');
const env={DB,ADMIN_EMAIL:'yourvajeremyalonzo@gmail.com',ALERT_EMAIL:'yourvajeremyalonzo@gmail.com',SITE_URL:'http://127.0.0.1:3000'};
const server=createServer(async(req,res)=>{
 try{
  if(req.headers.host!=='127.0.0.1:8787'){res.writeHead(403);res.end('Local access only');return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers)){if(value&&!['host','oai-authenticated-user-id','oai-authenticated-user-email','cf-connecting-ip'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);}
  headers.set('cf-connecting-ip','127.0.0.1');
  // Explicit opt-in for this loopback-only developer server; never compiled into the Worker.
  if(process.env.LOCAL_ADMIN_ENABLED==='true'){headers.set('oai-authenticated-user-id','local-developer');headers.set('oai-authenticated-user-email',env.ADMIN_EMAIL);}
  const response=await handleApi(new Request(`http://127.0.0.1:3000${req.url}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503);res.end(JSON.stringify({error:'Local booking server is unavailable.'}));}
});
server.listen(8787,'127.0.0.1',()=>console.log('Local booking database ready. Admin access '+(process.env.LOCAL_ADMIN_ENABLED==='true'?'enabled for this machine.':'requires LOCAL_ADMIN_ENABLED=true (development only).')));
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3000'],{stdio:'inherit',env:process.env});
next.on('exit',code=>{server.close();DB.close();process.exit(code||0);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{next.kill();server.close();});
