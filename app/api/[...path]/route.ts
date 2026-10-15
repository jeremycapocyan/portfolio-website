import { productionDatabase } from '../../../server/database';
import { handleVercelApi } from '../../../server/vercel-api';
import { authReady,reply } from '../../../server/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 const config={email:process.env.ADMIN_EMAIL||'yourvajeremyalonzo@gmail.com',passwordHash:process.env.ADMIN_PASSWORD_HASH||'',secret:process.env.ADMIN_SESSION_SECRET||'',origin:process.env.SITE_URL||'https://coach-jeremy.vercel.app'};
 if(new URL(request.url).pathname==='/api/auth/config'&&request.method==='GET')return reply({mode:'password',ready:authReady(config)});
 try{
  return await handleVercelApi(request,{DB:productionDatabase(),ALERT_EMAIL:process.env.ALERT_EMAIL||config.email,RESEND_API_KEY:process.env.RESEND_API_KEY,EMAIL_FROM:process.env.EMAIL_FROM},config);
 }catch{return reply({error:'The booking service is awaiting its database connection. Please message Coach Jeremy to arrange a session.'},503);}
}
export {handle as GET,handle as POST,handle as PATCH,handle as DELETE,handle as HEAD};
