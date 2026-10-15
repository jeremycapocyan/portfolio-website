import { handleApi } from '../worker/api';
import type { Env } from '../worker/types';
import { authenticated,authRoute,reply,type AuthConfig } from './auth';

export async function handleVercelApi(request:Request,env:Env,config:AuthConfig){
 try{
  const auth=await authRoute(request,env,config);if(auth)return auth;
  const headers=new Headers(request.headers);
  // These headers are trusted only behind Sites, never from a Vercel visitor.
  for(const name of ['oai-authenticated-user-id','oai-authenticated-user-email','cf-connecting-ip'])headers.delete(name);
  if(new URL(request.url).pathname.startsWith('/api/admin/')){
   if(!authenticated(request,config))return reply({error:'Sign in to manage your schedule.'},401);
   headers.set('oai-authenticated-user-id','coach-admin');headers.set('oai-authenticated-user-email',config.email);
  }
  // On Vercel this value is overwritten by the edge, unlike x-forwarded-for.
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if(ip)headers.set('cf-connecting-ip',ip);
  return handleApi(new Request(request,{headers}),{...env,ADMIN_EMAIL:config.email,SITE_URL:config.origin});
 }catch{return reply({error:'Booking service is not connected yet. Please message Coach Jeremy.'},503);}
}
