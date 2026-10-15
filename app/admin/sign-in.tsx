'use client';
import { useEffect,useState,type FormEvent } from 'react';
import { api } from '../booking-ui';
export default function SignIn({onSuccess}:{onSuccess:()=>Promise<unknown>}){
 const [mode,setMode]=useState(''),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{api<{mode:string;ready:boolean}>('/api/auth/config').then(c=>{setMode(c.mode);setReady(c.ready);}).catch(()=>setError('Unable to load sign-in. Refresh and try again.'));},[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,values=new FormData(form);setBusy(true);setError('');
  try{await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:values.get('email'),password:values.get('password')})});form.reset();await onSuccess();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="status-card"><h2>Welcome back, Coach.</h2>{mode==='sites'?<><p>Sign in with your authorized ChatGPT account to manage your schedule.</p><a className="button button-dark" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">Sign in with ChatGPT ↗</a></>:mode==='password'?<><p>Use your coach email and admin password.</p>{!ready?<p role="status">Admin sign-in is awaiting setup. Your administrator needs to configure the sign-in credentials in Vercel.</p>:<form className="schedule-form" onSubmit={submit}><label>Email<input type="email" name="email" autoComplete="username" defaultValue="yourvajeremyalonzo@gmail.com" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" maxLength={256} required/></label><button className="button button-dark" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>}</>:<p>Loading sign-in…</p>}{error&&<p role="alert" className="notice notice-error">{error}</p>}</section>;
}
