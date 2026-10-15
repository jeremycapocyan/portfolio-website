'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { api,dateKey,dateTime,time } from '../booking-ui';
type Block={id:string;start_at:number;end_at:number};
type Props={blocks:Block[];busy:boolean;mutate:(path:string,body:unknown,method?:string)=>Promise<boolean>};
export default function AvailabilityManager({blocks,busy,mutate}:Props){
 const dateInput=useRef<HTMLInputElement>(null);
 const [date,setDate]=useState(''),[start,setStart]=useState('13:00'),[end,setEnd]=useState('20:00'),[slots,setSlots]=useState<Block[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>setDate(dateKey(Date.now())),[]);
 useEffect(()=>{
  if(!date)return;const controller=new AbortController();setLoading(true);setError('');
  api<{slots:Block[]}>(`/api/availability?month=${date.slice(0,7)}&hours=2`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setSlots(result.slots.filter(s=>dateKey(s.start_at)===date));}).catch(e=>{if(!controller.signal.aborted){setSlots([]);setError(e.message);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[date,blocks,refresh]);
 async function block(from:string,to:string){
  const chosenDate=dateInput.current?.value||date;
  if(!chosenDate){setError('Choose a date first.');return;}
  setDate(chosenDate);
  const startAt=Date.parse(`${chosenDate}T${from}+08:00`),endAt=Date.parse(`${chosenDate}T${to}+08:00`);
  if(!Number.isFinite(startAt)||!Number.isFinite(endAt)||endAt<=startAt){setError('The end time must be after the start time.');return;}
  if(await mutate('/api/admin/blocks',{startAt:new Date(startAt).toISOString(),endAt:new Date(endAt).toISOString()}))setRefresh(v=>v+1);
 }
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const values=new FormData(event.currentTarget);void block(String(values.get('from')),String(values.get('to')));}
 return <section className="availability-manager"><div className="default-hours"><div><p className="tiny-label">DEFAULT AVAILABILITY · EVERY DAY</p><h2>1:00 PM — 8:00 PM</h2><p>Open automatically. Minimum 2 hours per session. All times are Philippine time (UTC+8).</p></div><a className="button button-dark" href="/#book" target="_blank" rel="noopener noreferrer">View client calendar ↗</a></div>
 <div className="admin-grid"><section className="status-card"><h2>Control your availability</h2><p>Choose a date to see the hours clients can book. Block a time range or the full day below.</p><label className="availability-date">Date<input type="date" ref={dateInput} value={date} min={dateKey(Date.now())} onInput={e=>setDate(e.currentTarget.value)} onBlur={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)} required/></label>
 <form className="schedule-form" onSubmit={submit}><div className="form-row"><label>Block from<input type="time" name="from" value={start} onInput={e=>setStart(e.currentTarget.value)} onChange={e=>setStart(e.target.value)} required/></label><label>Block until<input type="time" name="to" value={end} onInput={e=>setEnd(e.currentTarget.value)} onChange={e=>setEnd(e.target.value)} required/></label></div><div className="dashboard-actions"><button className="button button-dark" disabled={busy||!date}>{busy?'Saving…':'Block these hours'}</button><button type="button" className="button button-outline" disabled={busy||!date} onClick={()=>block('13:00','20:00')}>Block entire day</button></div></form>
 {error&&<p role="alert" className="notice notice-error">{error}</p>}<div className="time-options" aria-live="polite"><h3>Client availability · {date}</h3><p className="field-note">Two-hour sessions shown. Longer sessions are available when the full range is open.</p>{loading?<p>Checking availability…</p>:!slots.length?<p>No bookable hours on this date. Check your blocks and existing reservations below.</p>:<div>{slots.map(s=><span className="available-time" key={s.id}>{time(s.start_at)} – {time(s.end_at)}</span>)}</div>}<button className="text-link" type="button" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>Refresh hours ↻</button></div></section>
 <section className="status-card"><h2>Blocked hours</h2><p>Removing a block restores your default hours unless another block or reservation overlaps.</p>{blocks.length===0?<p className="notice">No blocked hours. Your daily 1 PM–8 PM schedule is open.</p>:<div className="schedule-list">{blocks.map(b=><article key={b.id}><div><strong>{dateTime(b.start_at)}</strong><p>Until {dateTime(b.end_at)}</p><span className="status-badge">Blocked</span></div><button className="button button-outline" disabled={busy} onClick={()=>mutate(`/api/admin/blocks/${b.id}`,{},'DELETE')}>Reopen these hours</button></article>)}</div>}</section></div></section>;
}
