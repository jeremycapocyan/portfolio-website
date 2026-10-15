import { ACTIVE, HOLD, HOUR, HttpError, estimatedTotal, expiresStatement, sessionTime, sha256, statement, type Env, type Reservation, type Slot } from './types';
import { emailReady, deliverEmails } from './email';
import { paymentProvider, requirePaymentProvider } from './payment-provider';
import { confirmVerifiedPayment } from './payments';
import { availability, dailySlot, DEFAULT_HOURS, noConflicts, withinCoachingHours } from './availability';

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function admin(request: Request, env: Env) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  if (!id || !email) throw new HttpError(401, 'Sign in with ChatGPT to manage your schedule.');
  if (!env.ADMIN_EMAIL || email !== env.ADMIN_EMAIL.toLowerCase()) throw new HttpError(403, 'This account does not have access to Coach Jeremy’s schedule.');
}
function sameOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin');
  const expected = env.SITE_URL ? new URL(env.SITE_URL).origin : new URL(request.url).origin;
  if (origin !== expected) throw new HttpError(403,'Please submit from the booking website.');
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415,'JSON request required.');
  const reader = request.body?.getReader(); if (!reader) throw new HttpError(400,'Request body required.');
  const chunks: Uint8Array[] = []; let size=0;
  while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>16000){await reader.cancel();throw new HttpError(413,'Request too large.');} chunks.push(value); }
  const bytes=new Uint8Array(size); let offset=0; for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try { const data=JSON.parse(new TextDecoder().decode(bytes)); if(!data||Array.isArray(data)||typeof data!=='object') throw new Error(); return data; } catch {throw new HttpError(400,'Invalid request.');}
}
function text(data: Record<string,unknown>, key: string, min=1, max=200) {
  const value=typeof data[key]==='string' ? data[key].trim() : '';
  if(value.length<min||value.length>max||/[\u0000-\u001f]/.test(value)) throw new HttpError(400,`Please enter a valid ${key}.`);
  return value;
}
function slotInput(data: Record<string,unknown>) {
  const start=Date.parse(text(data,'startAt')), end=Date.parse(text(data,'endAt'));
  const state=data.state;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.now()+HOUR||start>Date.now()+366*24*HOUR||end-start<(state==='blocked'?HOUR/2:2*HOUR)||end-start>12*HOUR||(end-start)%(30*60000)!==0) throw new HttpError(400,'Choose a future session of at least 2 hours (or a block of at least 30 minutes), at least an hour from now.');
  if(state!=='open'&&state!=='blocked') throw new HttpError(400,'Choose open or blocked.');
  if(state==='open'&&!withinCoachingHours(start,end))throw new HttpError(400,'Open sessions must be between 1:00 PM and 8:00 PM, with a two-hour minimum.');
  if(state==='open'&&(end-start)%HOUR!==0)throw new HttpError(400,'Choose a session length of 2–7 whole hours.');
  return {start,end,state};
}
async function rateLimit(request: Request, env: Env) {
  const now=Date.now(), window=Math.floor(now/HOUR)*HOUR;
  const key=await sha256(`reservation:${request.headers.get('cf-connecting-ip') || request.headers.get('oai-authenticated-user-id') || 'shared'}:${env.SITE_URL||''}`);
  const row=await statement(env,'INSERT INTO rate_limits (key,count,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=? THEN count+1 ELSE 1 END,window_start=? RETURNING count',key,window,window,window).first<{count:number}>();
  if(row && row.count>10) throw new HttpError(429,'Too many requests. Please try again later or message Coach Jeremy.');
  await statement(env,'DELETE FROM rate_limits WHERE window_start<?',now-24*HOUR).run();
}
async function authorizeReservation(request: Request,env:Env,id:string) {
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404,'Reservation not found. Use the private link from your reservation.');
  const r=await statement(env,'SELECT r.*,s.start_at,s.end_at FROM reservations r JOIN slots s ON r.slot_id=s.id WHERE r.id=? AND r.token_hash=?',id,await sha256(token)).first<Reservation>();
  if(!r) throw new HttpError(404,'Reservation not found.'); return r;
}
export async function handleApi(request: Request, env: Env, context?: {waitUntil(promise:Promise<unknown>):void}): Promise<Response> {
  try {
    if(new URL(request.url).pathname==='/api/auth/config'&&request.method==='GET')return json({mode:'sites',ready:true});
    if(!env.DB) throw new HttpError(503,'The booking calendar is temporarily unavailable. Please message Coach Jeremy.');
    const url=new URL(request.url), path=url.pathname, method=request.method;
    const sendEmails=() => { const promise=deliverEmails(env).catch(()=>({sent:0,connected:false})); if(context) context.waitUntil(promise); return promise; };
    if(path==='/api/payments/webhook' && method==='POST') {
      const provider=requirePaymentProvider(env);
      const payment=await provider.verifyWebhook(request,env);
      const result=await confirmVerifiedPayment(env,payment);
      await sendEmails(); return json(result);
    }
    if(!['GET','HEAD'].includes(method)) sameOrigin(request,env);
    if(path.startsWith('/api/admin/')) admin(request,env);
    await expiresStatement(env).run();
    if(path==='/api/availability' && method==='GET') {
      const result=await availability(env,url.searchParams.get('month')||'',Number(url.searchParams.get('hours')||2));
      return json({...result,paymentsReady:Boolean(paymentProvider(env)),emailReady:emailReady(env)});
    }
    if(path==='/api/reservations'&&method==='POST') {
      await rateLimit(request,env);
      const data=await body(request);
      if(data.website) throw new HttpError(400,'Unable to reserve.');
      const name=text(data,'name',2,100), email=text(data,'email',5,254).toLowerCase(),phone=text(data,'phone',7,30),location=text(data,'location',5,300),slotId=text(data,'slotId',10,64);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,'Please enter a valid email address.');
      if(!/^[+\d\s()\-]+$/.test(phone)) throw new HttpError(400,'Please enter a valid phone number.');
      const players=Number(data.players); if(!Number.isInteger(players)||players<1||players>8||data.consent!==true) throw new HttpError(400,'Choose 1–8 players and accept the reservation terms.');
      const generated=dailySlot(slotId);
      if(generated){
        if(generated.start_at<=Date.now()+HOUR||generated.start_at>Date.now()+366*24*HOUR)throw new HttpError(409,'That session is outside the booking window.');
        await statement(env,"INSERT INTO slots (id,start_at,end_at,state) VALUES (?,?,?,'open') ON CONFLICT(id) DO NOTHING",generated.id,generated.start_at,generated.end_at).run();
      }
      const slot=await statement(env,'SELECT * FROM slots WHERE id=?',slotId).first<Slot>();
      if(slot&&!withinCoachingHours(slot.start_at,slot.end_at))throw new HttpError(400,'Sessions must be at least two hours and between 1:00 PM and 8:00 PM.');
      const now=Date.now(); if(!slot||slot.start_at<=now+HOUR) throw new HttpError(409,'That session is no longer available. Please choose another.');
      const id=crypto.randomUUID(), token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),expiry=Math.min(now+HOLD,slot.start_at),estimate=estimatedTotal(players,slot.end_at-slot.start_at);
      const statements=[expiresStatement(env,now),statement(env,`INSERT INTO reservations (id,slot_id,token_hash,name,email,phone,location,players,estimated_total,status,expires_at,created_at) SELECT ?,s.id,?,?,?,?,?,?,?,'pending_review',?,? FROM slots s WHERE s.id=? AND s.state='open' AND s.start_at>? AND s.start_at=? AND s.end_at=? AND ${noConflicts}`,id,await sha256(token),name,email,phone,location,players,estimate,expiry,now,slotId,now+HOUR,slot.start_at,slot.end_at)];
      if(env.ALERT_EMAIL) statements.push(statement(env,"INSERT INTO email_outbox (id,reservation_id,recipient,subject,body,state,attempts) SELECT ?,id,?,?,?,'pending',0 FROM reservations WHERE id=?",`${id}:alert`,env.ALERT_EMAIL,'New coaching reservation — review required',`New reservation ${id}\n${name}\n${email}\n${phone}\n${sessionTime(slot.start_at)}\nPlayers: ${players}\nCourt: ${location}\nReview in your Coach Jeremy admin dashboard. This is not a confirmed booking.`,id));
      let result; try {result=await env.DB.batch(statements);} catch(error) {if(String(error).includes('UNIQUE')) throw new HttpError(409,'Someone just reserved that session. Please choose another.'); throw error;}
      if(!result[1].meta.changes) throw new HttpError(409,'That session is no longer available. Please choose another.');
      await sendEmails();
      return json({id,token,status:'pending_review',expiresAt:expiry,estimatedTotal:estimate,emailConnected:emailReady(env)},201);
    }
    const reservationMatch=path.match(/^\/api\/reservations\/([a-f0-9-]{36})(\/checkout)?$/);
    if(reservationMatch) {
      const r=await authorizeReservation(request,env,reservationMatch[1]);
      if(method==='GET'&&!reservationMatch[2]) {
        const delivery=await statement(env,'SELECT state FROM email_outbox WHERE id=?',`${r.id}:confirmation`).first<{state:string}>();
        return json({id:r.id,status:r.status,startAt:r.start_at,endAt:r.end_at,players:r.players,location:r.location,estimatedTotal:r.estimated_total,quotedTotal:r.quoted_total,expiresAt:r.expires_at,paymentsReady:Boolean(paymentProvider(env)),confirmationEmail:delivery?.state||'not_sent'});
      }
      if(method==='POST'&&reservationMatch[2]) {
        if(r.status!=='awaiting_payment'||!r.quote_id||r.quoted_total===null||r.expires_at<=Date.now()) throw new HttpError(409,'A valid quote from Coach Jeremy is required before payment.');
        if(!emailReady(env)) throw new HttpError(503,'Booking confirmation email is not connected yet. Please contact Coach Jeremy.');
        const result=await requirePaymentProvider(env).createCheckout({reservationId:r.id,quoteId:r.quote_id,amount:r.quoted_total,currency:'PHP',expiresAt:r.expires_at},env);
        if(new URL(result.url).protocol!=='https:') throw new HttpError(502,'Invalid checkout URL.');
        return json(result);
      }
    }
    if(path==='/api/admin/dashboard'&&method==='GET') {
      const slots=await statement(env,`SELECT s.*,r.id AS reservation_id,r.status AS reservation_status FROM slots s LEFT JOIN reservations r ON r.slot_id=s.id AND r.status IN ${ACTIVE} WHERE s.end_at>? AND (s.id NOT LIKE 'daily-%' OR r.id IS NOT NULL) ORDER BY s.start_at LIMIT 500`,Date.now()-30*24*HOUR).all();
      const bookings=await statement(env,'SELECT r.id,r.name,r.email,r.phone,r.location,r.players,r.status,r.estimated_total,r.quoted_total,r.expires_at,r.created_at,s.start_at,s.end_at FROM reservations r JOIN slots s ON s.id=r.slot_id ORDER BY r.created_at DESC LIMIT 200').all();
      const emails=await statement(env,"SELECT id,reservation_id,recipient,subject,state,attempts FROM email_outbox WHERE state!='sent' ORDER BY rowid DESC LIMIT 100").all();
      const blocks=await statement(env,'SELECT id,start_at,end_at FROM time_blocks WHERE end_at>? ORDER BY start_at',Date.now()).all();
      return json({defaults:DEFAULT_HOURS,blocks:blocks.results,slots:slots.results,reservations:bookings.results,emails:emails.results,paymentsReady:Boolean(paymentProvider(env)),emailReady:emailReady(env),adminEmail:env.ADMIN_EMAIL});
    }
    if(path==='/api/admin/blocks'&&method==='POST') {
      const data=await body(request), start=Date.parse(text(data,'startAt')),end=Date.parse(text(data,'endAt'));
      if(!Number.isFinite(start)||!Number.isFinite(end)||end<=Date.now()||end<=start||end-start>31*24*HOUR||start>Date.now()+366*24*HOUR||start<Date.now()-24*HOUR)throw new HttpError(400,'Choose a current or future time range, up to 31 days.');
      const id=crypto.randomUUID();
      const result=await statement(env,`INSERT INTO time_blocks (id,start_at,end_at) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM reservations r JOIN slots s ON s.id=r.slot_id WHERE r.status IN ${ACTIVE} AND s.start_at<? AND s.end_at>?)`,id,start,end,end,start).run();
      if(!result.meta.changes)throw new HttpError(409,'This range overlaps a reservation. Cancel an unpaid reservation before blocking its time.');
      return json({id},201);
    }
    const blockMatch=path.match(/^\/api\/admin\/blocks\/([a-f0-9-]{36})$/);
    if(blockMatch&&method==='DELETE'){
      const result=await statement(env,'DELETE FROM time_blocks WHERE id=?',blockMatch[1]).run();
      if(!result.meta.changes)throw new HttpError(404,'This block was already removed.');
      return json({reopened:true});
    }
    if(path==='/api/admin/slots'&&method==='POST') {
      const data=slotInput(await body(request)), id=crypto.randomUUID();
      const result=await statement(env,'INSERT INTO slots (id,start_at,end_at,state) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM slots WHERE start_at<? AND end_at>?)',id,data.start,data.end,data.state,data.end,data.start).run();
      if(!result.meta.changes) throw new HttpError(409,'This time overlaps another open or blocked session. Edit the existing session instead.');
      return json({id},201);
    }
    const slotMatch=path.match(/^\/api\/admin\/slots\/([a-f0-9-]{36})$/);
    if(slotMatch&&method==='PATCH') {
      const data=slotInput(await body(request));
      const result=await statement(env,`UPDATE slots SET start_at=?,end_at=?,state=? WHERE id=? AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.slot_id=slots.id AND r.status IN ${ACTIVE}) AND NOT EXISTS (SELECT 1 FROM slots other WHERE other.id!=slots.id AND other.start_at<? AND other.end_at>?)`,data.start,data.end,data.state,slotMatch[1],data.end,data.start).run();
      if(!result.meta.changes) throw new HttpError(409,'Cannot edit: this session is reserved, missing, or overlaps another session. Cancel pending reservations first.');
      return json({saved:true});
    }
    const actionMatch=path.match(/^\/api\/admin\/reservations\/([a-f0-9-]{36})\/(quote|cancel)$/);
    if(actionMatch&&method==='POST') {
      const id=actionMatch[1],action=actionMatch[2],data=await body(request);
      if(action==='cancel') {
        const result=await statement(env,"UPDATE reservations SET status='cancelled' WHERE id=? AND status IN ('pending_review','awaiting_payment')",id).run();
        if(!result.meta.changes) throw new HttpError(409,'Only unpaid pending reservations can be cancelled here.');
        return json({cancelled:true});
      }
      const amount=Math.round(Number(data.totalPHP)*100);
      if(!Number.isSafeInteger(amount)||amount<10000||amount>10000000) throw new HttpError(400,'Enter a total quote between ₱100 and ₱100,000.');
      const result=await statement(env,"UPDATE reservations SET status='awaiting_payment',quoted_total=?,quote_id=? WHERE id=? AND status='pending_review' AND expires_at>?",amount,crypto.randomUUID(),id,Date.now()).run();
      if(!result.meta.changes) throw new HttpError(409,'This reservation cannot be quoted. It may have expired or already been quoted.');
      return json({quoted:true});
    }
    if(path==='/api/admin/emails/retry'&&method==='POST') {await body(request);return json(await deliverEmails(env));}
    throw new HttpError(404,'Not found.');
  } catch(error) {
    if(error instanceof HttpError) return json({error:error.message},error.status);
    console.error('Booking request failed',error instanceof Error ? error.name : 'UnknownError');
    return json({error:'The booking calendar is temporarily unavailable. Please try again or message Coach Jeremy.'},503);
  }
}
