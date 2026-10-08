import { handleApi } from './api';
import type { Env } from './types';
declare const __PAGES__: Record<string,string>;
export default {
 async fetch(request:Request,env:Env,ctx:{waitUntil(p:Promise<unknown>):void}):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return handleApi(request,env,ctx);
  const key=url.pathname.replace(/\/$/,'')||'/';
  const html=__PAGES__[key];
  if(html&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'}});
  if(env.ASSETS)return env.ASSETS.fetch(request);
  return new Response('Not found',{status:404});
 }
};
