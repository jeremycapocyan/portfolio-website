import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { scryptSync } from 'node:crypto';
import { migrate } from '../scripts/migrate-turso.mjs';
import { databaseAdapter } from '../server/database';
import { authenticated,createSession,type AuthConfig } from '../server/auth';
import { handleVercelApi } from '../server/vercel-api';
const password='integration-test-password-only',salt='1'.repeat(32);
const config:AuthConfig={email:'coach@example.com',passwordHash:`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`,secret:'test-secret-'.repeat(5),origin:'https://coach.example.com'};
const req=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>new Request(config.origin+path,{method,headers:{origin:config.origin,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
async function setup(){const client=createClient({url:':memory:'});await migrate(client);return {client,env:{DB:databaseAdapter(client)}};}
test('Turso migrations are repeatable and batch failures roll back all writes',async()=>{
 const {client,env}=await setup();try{await migrate(client);
 await assert.rejects(env.DB.batch([env.DB.prepare("INSERT INTO slots VALUES ('test',1,2,'open')"),env.DB.prepare('INSERT INTO missing_table VALUES (1)')]));
 assert.equal(await env.DB.prepare("SELECT * FROM slots WHERE id='test'").first(),null);
 }finally{client.close();}
});
test('Vercel strips forged identity headers and requires a signed session',async()=>{
 const {client,env}=await setup();try{
 const forged=await handleVercelApi(req('/api/admin/dashboard','GET',undefined,{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':config.email}),env,config);
 assert.equal(forged.status,401);
 const login=await handleVercelApi(req('/api/auth/login','POST',{email:config.email,password}),env,config);assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 const dashboard=await handleVercelApi(req('/api/admin/dashboard','GET',undefined,{cookie:cookie.split(';')[0]}),env,config);assert.equal(dashboard.status,200);
 const signedOut=await handleVercelApi(req('/api/auth/logout','POST',{}, {cookie}),env,config);assert.match(signedOut.headers.get('set-cookie')!,/Max-Age=0/);
 assert.equal((await handleVercelApi(req('/api/admin/dashboard'),env,config)).status,401);
 }finally{client.close();}
});
test('admin cookies reject tampering, expiry, password rotation and missing configuration',()=>{
 const now=Date.now(),token=createSession(config,now),request=req('/api/admin/dashboard','GET',undefined,{cookie:`__Host-coach_session=${token}`});
 assert.equal(authenticated(request,config,now),true);
 assert.equal(authenticated(request,config,now+9*3600000),false);
 assert.equal(authenticated(request,{...config,passwordHash:config.passwordHash.replace(/.$/,'0')}),false);
 assert.equal(authenticated(request,{...config,secret:''}),false);
 assert.equal(authenticated(req('/api/admin/dashboard','GET',undefined,{cookie:`__Host-coach_session=${token}x`}),config),false);
});
test('admin login enforces origin, credentials and persistent attempt limits',async()=>{
 const {client,env}=await setup();try{
 assert.equal((await handleVercelApi(req('/api/auth/login','POST',{email:config.email,password},{origin:'https://evil.example'}),env,config)).status,403);
 for(let i=0;i<10;i++)assert.equal((await handleVercelApi(req('/api/auth/login','POST',{email:config.email,password:'wrong'}),env,config)).status,401);
 assert.equal((await handleVercelApi(req('/api/auth/login','POST',{email:config.email,password}),env,config)).status,429);
 }finally{client.close();}
});
test('Vercel admin blocks affect public availability and competing holds stay atomic on libSQL',async()=>{
 const {client,env}=await setup();try{
 const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10),month=day.slice(0,7),cookie=`__Host-coach_session=${createSession(config)}`;
 const query=`/api/availability?month=${month}&hours=2`;
 const get=async()=>(await (await handleVercelApi(req(query),env,config)).json()).slots.filter((s:{id:string})=>s.id.startsWith(`daily-${day}`));
 assert.equal((await get()).length,6);
 const blocked=await handleVercelApi(req('/api/admin/blocks','POST',{startAt:`${day}T15:00:00+08:00`,endAt:`${day}T17:00:00+08:00`},{cookie}),env,config);assert.equal(blocked.status,201);assert.equal((await get()).length,3);
 const id=(await blocked.json()).id;
 assert.equal((await handleVercelApi(req(`/api/admin/blocks/${id}`,'DELETE',{}, {cookie}),env,config)).status,200);assert.equal((await get()).length,6);
 const input={name:'Test Player',email:'player@example.com',phone:'09123456789',location:'Test court',players:1,consent:true};
 const results=await Promise.all([13,14].map(h=>handleVercelApi(req('/api/reservations','POST',{...input,slotId:`daily-${day}-${h}-2`}),env,config)));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 assert.equal((await env.DB.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status='confirmed'").first<{count:number}>())?.count,0);
 }finally{client.close();}
});
