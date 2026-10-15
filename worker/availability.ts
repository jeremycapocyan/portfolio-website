import { ACTIVE, HOUR, HttpError, statement, type Env, type Slot } from './types';

export const DEFAULT_HOURS={startHour:13,endHour:20,minHours:2,timeZone:'Asia/Manila'};
export const manilaDate=(value:number)=>new Date(value+8*HOUR).toISOString().slice(0,10);
export function dailySlot(id:string):Slot|null {
 const match=/^daily-(\d{4}-\d{2}-\d{2})-(\d{2})-([2-7])$/.exec(id);
 if(!match)return null;
 const hour=Number(match[2]),duration=Number(match[3]);
 const start=Date.parse(`${match[1]}T${match[2]}:00:00+08:00`);
 if(!Number.isFinite(start)||manilaDate(start)!==match[1]||hour<13||hour+duration>20)return null;
 return{id,start_at:start,end_at:start+duration*HOUR,state:'open'};
}
export function withinCoachingHours(start:number,end:number){
 const local=new Date(start+8*HOUR),localEnd=new Date(end+8*HOUR);
 return manilaDate(start)===manilaDate(end)&&local.getUTCHours()>=13&&localEnd.getUTCHours()+(localEnd.getUTCMinutes()/60)<=20&&end-start>=2*HOUR;
}
export async function availability(env:Env,month:string,hours:number,now=Date.now()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(hours)||hours<2||hours>7)throw new HttpError(400,'Choose a valid month and a session of 2–7 hours.');
 const [year,number]=month.split('-').map(Number);
 const start=Date.UTC(year,number-1,1)-8*HOUR,end=Date.UTC(year,number,1)-8*HOUR;
 const horizon=now+366*24*HOUR;
 if(end<=now||start>horizon)return{slots:[],...DEFAULT_HOURS};
 const [blocks,reserved,manual]=await Promise.all([
  statement(env,"SELECT start_at,end_at FROM time_blocks WHERE start_at<? AND end_at>? UNION ALL SELECT start_at,end_at FROM slots WHERE state='blocked' AND start_at<? AND end_at>?",end,start,end,start).all<Slot>(),
  statement(env,`SELECT s.start_at,s.end_at FROM reservations r JOIN slots s ON s.id=r.slot_id WHERE r.status IN ${ACTIVE} AND s.start_at<? AND s.end_at>?`,end,start).all<Slot>(),
  statement(env,"SELECT id,start_at,end_at,state FROM slots WHERE state='open' AND id NOT LIKE 'daily-%' AND start_at>=? AND start_at<? AND end_at-start_at=?",start,end,hours*HOUR).all<Slot>()
 ]);
 const candidates:Slot[]=[];
 for(let date=start;date<end;date+=24*HOUR){for(let hour=13;hour+hours<=20;hour++){
  const at=date+hour*HOUR;if(at<=now+HOUR||at>horizon)continue;
  const id=`daily-${manilaDate(at)}-${hour}-${hours}`;
  candidates.push({id,start_at:at,end_at:at+hours*HOUR,state:'open'});
 }}
 const unique=new Map<string,Slot>();
 for(const s of [...candidates,...manual.results]){
  if(s.start_at<=now+HOUR||s.start_at>horizon||!withinCoachingHours(s.start_at,s.end_at))continue;
  if([...blocks.results,...reserved.results].some(b=>b.start_at<s.end_at&&b.end_at>s.start_at))continue;
  unique.set(`${s.start_at}:${s.end_at}`,s);
 }
 return{slots:[...unique.values()].sort((a,b)=>a.start_at-b.start_at).map(({id,start_at,end_at})=>({id,start_at,end_at})),...DEFAULT_HOURS};
}

// Executed inside the reservation INSERT, so concurrent requests for different
// overlapping start times cannot both acquire the coach's time.
export const noConflicts=`NOT EXISTS (SELECT 1 FROM time_blocks b WHERE b.start_at<s.end_at AND b.end_at>s.start_at)
 AND NOT EXISTS (SELECT 1 FROM slots b WHERE b.state='blocked' AND b.start_at<s.end_at AND b.end_at>s.start_at)
 AND NOT EXISTS (SELECT 1 FROM reservations r JOIN slots booked ON booked.id=r.slot_id WHERE r.status IN ${ACTIVE} AND booked.start_at<s.end_at AND booked.end_at>s.start_at)`;
