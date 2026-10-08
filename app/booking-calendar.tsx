'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { api, dateKey, dateTime, FACEBOOK, money, time } from './booking-ui';

type Slot = { id: string; start_at: number; end_at: number };
type Held = { id: string; token: string; expiresAt: number };
export default function BookingCalendar() {
  const [month, setMonth] = useState(''), [slots, setSlots] = useState<Slot[]>([]), [day, setDay] = useState(''), [slotId, setSlotId] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0), [busy, setBusy] = useState(false), [players, setPlayers] = useState(1), [held, setHeld] = useState<Held | null>(null);
  useEffect(() => { setMonth(dateKey(Date.now()).slice(0, 7)); }, []);
  useEffect(() => {
    if (!month) return;
    const controller = new AbortController(); setLoading(true); setError(''); setSlots([]); setSlotId(''); setDay('');
    api<{ slots: Slot[] }>(`/api/availability?month=${month}`, { signal: controller.signal }).then(data => { setSlots(data.slots); if (data.slots[0]) setDay(dateKey(data.slots[0].start_at)); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, refresh]);
  const selected = slots.find(s => s.id === slotId);
  const days = month ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate() : 0;
  const offset = month ? new Date(`${month}-01T12:00:00Z`).getUTCDay() : 0;
  const availableDays = new Set(slots.map(s => dateKey(s.start_at)));
  function changeMonth(delta: number) { const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + delta); setMonth(d.toISOString().slice(0, 7)); }
  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return; setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { setHeld(await api<Held>('/api/reservations', { method: 'POST', body: JSON.stringify({ ...Object.fromEntries(form), slotId, players, consent: form.get('consent') === 'on' }) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const privateLink = held ? `/booking#id=${held.id}&token=${held.token}` : '';
  return <section id="book" className="booking-section section-space"><div className="container">
    <div className="section-heading"><div><p className="eyebrow dark-eyebrow">YOUR NEXT SESSION</p><h2>Make time<br/><em>for your game.</em></h2></div><p>Choose an open session. I’ll review your court<br className="desktop-break" /> location and confirm the final coaching rate.</p></div>
    {held ? <div className="reservation-success" role="status"><CalendarDays size={32}/><h3>Your time is on hold.</h3><p>This is a pending reservation, not a confirmed booking. Your hold ends {dateTime(held.expiresAt)} (Philippine time). Only verified payment confirms your session.</p><p><strong>Save your private reservation link.</strong> Use it to view your quote and booking status. Payment is not connected yet; message me to discuss your session.</p><a className="button button-lime" href={privateLink}>View & save my reservation <ArrowUpRight size={18}/></a><a className="text-link" href={FACEBOOK} target="_blank" rel="noopener noreferrer">Message Coach Jeremy ↗</a></div> : <div className="booking-grid">
      <div className="calendar-panel"><div className="calendar-toolbar"><h3>{month ? new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }) : 'Session calendar'}</h3><div><button type="button" aria-label="Previous month" disabled={!month || month <= dateKey(Date.now()).slice(0, 7)} onClick={() => changeMonth(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label="Next month" disabled={!month || month >= dateKey(Date.now() + 365 * 86400000).slice(0, 7)} onClick={() => changeMonth(1)}><ChevronRight size={20}/></button></div></div>
      <p className="field-note"><Clock3 size={14}/> All times in the Philippines (UTC+8)</p>
      <div className="calendar-week" aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}</div>
      <div className="calendar-days" role="group" aria-label="Choose an available date">{Array.from({length:offset}, (_,i) => <span key={`empty${i}`}/>)}{Array.from({length:days}, (_,i) => { const key = `${month}-${String(i+1).padStart(2,'0')}`; return <button type="button" key={key} disabled={loading || !availableDays.has(key)} className={day === key ? 'selected' : ''} aria-pressed={day === key} aria-label={`${key}${availableDays.has(key) ? ', sessions available' : ', unavailable'}`} onClick={() => { setDay(key); setSlotId(''); }}>{i+1}{availableDays.has(key) && <span className="availability-dot"/>}</button>; })}</div>
      <p className="calendar-legend"><span className="availability-dot"/> Open coaching sessions</p>
      <div className="time-options" aria-live="polite">{loading ? <p>Loading available sessions…</p> : !slots.length ? <p>No open sessions this month. Try another month or <a href={FACEBOOK} target="_blank" rel="noopener noreferrer">message me for availability ↗</a>.</p> : <><h4>{day ? new Date(`${day}T12:00:00+08:00`).toLocaleDateString('en-PH', { weekday:'long', month:'short', day:'numeric', timeZone:'Asia/Manila' }) : 'Choose a date'}</h4><div>{slots.filter(s => dateKey(s.start_at) === day).map(s => <button key={s.id} type="button" className={slotId === s.id ? 'selected' : ''} aria-pressed={slotId === s.id} onClick={() => setSlotId(s.id)}>{time(s.start_at)} – {time(s.end_at)}</button>)}</div></>}</div><button type="button" className="text-link" onClick={() => setRefresh(r => r+1)} disabled={loading}>Refresh availability ↻</button></div>
      <form className="reservation-form" onSubmit={reserve}><p className="tiny-label">LET’S PLAN YOUR COURT TIME</p><h3>{selected ? 'Your session details' : 'Find your next session'}</h3><p>{selected ? `${dateTime(selected.start_at)} – ${time(selected.end_at)}` : 'Select an open date and time to reserve a session.'}</p>
      <div className="form-row"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Number of players<select value={players} onChange={e => setPlayers(Number(e.target.value))}>{Array.from({length:8},(_,i) => <option key={i+1} value={i+1}>{i+1} {i ? 'players' : 'player'}</option>)}</select></label></div>
      <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Mobile number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30}/></label><label>Your court location<input name="location" autoComplete="street-address" placeholder="Court name, city, and address" required minLength={5} maxLength={300}/></label>
      <label className="honey-field" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
      {selected && <div className="booking-estimate"><span>Estimated group total</span><strong>{money((players === 1 ? 600 : players <= 3 ? 500 : 400) * 100 * players * (selected.end_at-selected.start_at)/3600000)}</strong><small>For {players} {players === 1 ? 'player' : 'players'} · {(selected.end_at-selected.start_at)/3600000} hour(s). Final rate depends on location.</small></div>}
      <label className="consent-label"><input type="checkbox" name="consent" required/><span>I understand this is a hold for up to 24 hours, subject to coach review and the final rate. My booking is confirmed only after verified payment. I agree that my details will be used to arrange my session and send booking emails.</span></label>
      <button className="button button-dark" type="submit" disabled={!selected || busy}>{busy ? 'Reserving your time…' : 'Reserve this session'}<ArrowUpRight size={18}/></button><p className="field-note">Payment connection coming soon. No payment is collected here yet.</p></form>
    </div>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
  </div></section>;
}
