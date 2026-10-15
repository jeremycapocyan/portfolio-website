import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { type Env, statement } from '../worker/types';
const scrypt=promisify(scryptCallback);
const COOKIE='__Host-coach_session';
const TTL=8*60*60;
export type AuthConfig={email:string;passwordHash:string;secret:string;origin:string};
export const reply=(value:unknown,status=200,headers:Record<string,string>={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
export function authReady(config:AuthConfig){return config.secret.length>=32&&/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash)&&!!config.email;}
const sign=(payload:string,config:AuthConfig)=>createHmac('sha256',config.secret).update(payload).digest('base64url');
const equal=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createSession(config:AuthConfig,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({email:config.email,exp:Math.floor(now/1000)+TTL,nonce:randomBytes(16).toString('hex'),version:createHmac('sha256',config.secret).update(config.passwordHash).digest('hex')})).toString('base64url');
 return `${payload}.${sign(payload,config)}`;
}
export function authenticated(request:Request,config:AuthConfig,now=Date.now()){
 if(!authReady(config))return false;
 const cookie=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
 if(!cookie||cookie.length>2048)return false;
 const parts=cookie.split('.');if(parts.length!==2||!equal(sign(parts[0],config),parts[1]))return false;
 try{const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());return payload.email===config.email&&Number.isInteger(payload.exp)&&payload.exp>now/1000&&payload.exp<=now/1000+TTL&&payload.version===createHmac('sha256',config.secret).update(config.passwordHash).digest('hex');}catch{return false;}
}
export async function authRoute(request:Request,env:Env,config:AuthConfig):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(path==='/api/auth/config'&&request.method==='GET')return reply({mode:'password',ready:authReady(config)});
 if(!['/api/auth/login','/api/auth/logout'].includes(path))return null;
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(request.headers.get('origin')!==config.origin)return reply({error:'Please sign in from this website.'},403);
 const attributes='Path=/; HttpOnly; Secure; SameSite=Strict';
 if(path.endsWith('/logout'))return reply({signedOut:true},200,{'Set-Cookie':`${COOKIE}=; Max-Age=0; ${attributes}`});
 if(!authReady(config))return reply({error:'Admin sign-in is not configured yet. Complete the Vercel environment setup.'},503);
 // A shared durable limit also prevents attackers rotating supplied IP headers.
 const key='admin-login',window=Math.floor(Date.now()/900000)*900000;
 const limit=await statement(env,'INSERT INTO rate_limits (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=? THEN count+1 ELSE 1 END,window_start=? RETURNING count',key,window,window,window).first<{count:number}>();
 if(!limit||limit.count>10)return reply({error:'Too many sign-in attempts. Try again in 15 minutes.'},429,{'Retry-After':'900'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
 const reader=request.body?.getReader();let raw='',size=0;
 if(!reader)return reply({error:'Enter your email and password.'},400);
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply({error:'Request too large.'},413);}raw+=new TextDecoder().decode(value,{stream:true});}
 let input;try{input=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
 if(!input||typeof input.email!=='string'||typeof input.password!=='string'||input.password.length>256)return reply({error:'Invalid email or password.'},401);
 const [,salt,expected]=config.passwordHash.split(':');
 const actual=await scrypt(input.password,salt,64) as Buffer;
 if(!equal(actual.toString('hex'),expected)||input.email.trim().toLowerCase()!==config.email.toLowerCase())return reply({error:'Invalid email or password.'},401);
 return reply({signedIn:true},200,{'Set-Cookie':`${COOKIE}=${createSession(config)}; Max-Age=${TTL}; ${attributes}`});
}
