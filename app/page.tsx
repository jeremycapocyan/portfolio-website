'use client';

import { ArrowUpRight, ArrowRight, Play, Award, Menu, X, Phone, Check, Target, Users, MoveUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const photos = [
  { src: 'lesson', title: 'The little details make the difference', category: 'On the court' },
  { src: 'group', title: 'Better together', category: 'Our community' },
  { src: 'coaching', title: 'One good rep at a time', category: 'On the court' },
  { src: 'players', title: 'New faces. New rallies.', category: 'Our community' },
  { src: 'family', title: 'A game to share', category: 'Our community' },
  { src: 'court', title: 'Putting practice into play', category: 'On the court' },
  { src: 'academy', title: 'Philippine Pickleball Academy', category: 'Our community' },
];

export default function Home() {
 const [menuOpen, setMenuOpen] = useState(false);
 const [filter, setFilter] = useState('All moments');
 const [selected, setSelected] = useState<number | null>(null);
 const [videoOpen, setVideoOpen] = useState(false);
 const dialog = useRef<HTMLDialogElement>(null);
 const trigger = useRef<HTMLElement | null>(null);
 const modalOpen = selected !== null || videoOpen;
 useEffect(() => {
   if (modalOpen) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); document.body.style.overflow = 'hidden'; }
   else { dialog.current?.close(); document.body.style.overflow = ''; trigger.current?.focus(); }
   return () => { document.body.style.overflow = ''; };
 }, [modalOpen]);
 function closeModal() { setSelected(null); setVideoOpen(false); }
 const nav = [['About me', '#about'], ['Coaching', '#coaching'], ['On the court', '#moments']];

 return <>
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="site-header">
   <a className="brand" href="#" aria-label="Coach Jeremy home"><span className="brand-mark" aria-hidden="true"><img src="/media/coach-mark.png" alt="" /></span><span>COACH JEREMY<small>PICKLEBALL COACH</small></span></a>
   <nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav>
   <a href="#contact" className="button button-lime header-cta">Let’s play <ArrowUpRight size={17} /></a>
   <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X /> : <Menu />}</button>
   {menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{[...nav, ['Book a session', '#contact']].map(([label, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={18}/></a>)}</nav>}
  </header>
  <main id="main">
   <section className="hero">
    <div className="hero-photo"><img src="/media/coaching.webp" alt="Coach Jeremy preparing a pickleball drill on court" fetchPriority="high"/><div className="photo-shade" /></div>
    <div className="hero-lines" aria-hidden="true" />
    <div className="hero-content container">
     <p className="eyebrow"><span className="status-dot"/> YOUR GAME. YOUR JOURNEY.</p>
     <h1>GOOD GAMES<br/>START WITH<br/><span>GREAT BASICS.</span></h1>
     <p className="hero-intro">Hey, I’m Jeremy Capocyan. Let’s build your confidence,<br className="desktop-break"/> find your rhythm, and make every rally count.</p>
     <div className="hero-actions"><a href="#contact" className="button button-lime">Train with me <ArrowUpRight size={20}/></a><button onClick={() => setVideoOpen(true)} className="watch-button"><span className="play-circle"><Play size={15} fill="currentColor"/></span> See me on court</button></div>
     <div className="hero-proof"><Award size={24}/><div><strong>PhPA Level 1 Certified Coach</strong><span>Philippine Pickleball Academy</span></div></div>
    </div>
    <div className="hero-caption"><span className="tiny-label">MEET YOUR COACH</span><strong>Jeremy Capocyan</strong><span>Passion for the game. Patience for the process.</span></div>
    <a href="#about" className="hero-scroll" aria-label="Discover more">SCROLL TO EXPLORE <span>↓</span></a>
   </section>
   <div className="rally-strip"><span>LEARN THE GAME.</span><span className="ball-dot" aria-hidden="true">✳</span><span>LOVE THE PROCESS.</span><span className="ball-dot" aria-hidden="true">✳</span><span>PLAY YOUR BEST.</span><span className="ball-dot" aria-hidden="true">✳</span></div>
   <section id="about" className="about-section container section-space">
    <div className="about-photo"><img src="/media/portrait.webp" alt="Jeremy Capocyan with the Philippine Pickleball Academy banner" loading="lazy"/><div className="photo-note"><Award size={27}/><span>Certified to coach.<br/><strong>Here to help you grow.</strong></span></div></div>
    <div className="about-copy"><p className="eyebrow dark-eyebrow">01 / THE COACH BEHIND THE PADDLE</p><h2>A little guidance.<br/>A whole new <em>game.</em></h2><p>I’m Jeremy, a PhPA Level 1 certified pickleball coach helping beginner and intermediate players feel more at home on the court.</p><p>Whether you’re picking up a paddle for the first time or working toward more consistent rallies, we’ll focus on the fundamentals that make a difference—one clear explanation, one purposeful drill, and one good rep at a time.</p><div className="about-values"><span><Check size={17}/> Patient, practical coaching</span><span><Check size={17}/> Progress at your pace</span><span><Check size={17}/> A welcoming place to play</span></div><a className="text-link" href="#coaching">Find your starting point <ArrowUpRight size={19}/></a></div>
   </section>
   <section id="coaching" className="coaching-section section-space"><div className="container">
    <div className="section-heading"><div><p className="eyebrow dark-eyebrow">02 / FIND YOUR NEXT LEVEL</p><h2>Your goals.<br/><em>Our game plan.</em></h2></div><p>Start where you are. We’ll work on the skills<br className="desktop-break"/> that help you enjoy the game even more.</p></div>
    <div className="program-grid">{[
     {number:'01',icon:<Target size={28}/>,label:'NEW TO THE GAME',title:'Build your foundation',description:'Get comfortable with your paddle, learn the rules, and take your first rallies in stride.',items:['Grip, stance & footwork','Serve & return basics','Scoring & court positioning'],cta:'Let’s get started',subject:'beginner coaching'},
     {number:'02',icon:<MoveUpRight size={28}/>,label:'READY TO LEVEL UP',title:'Play with purpose',description:'Turn the basics into habits. Build consistency and make more confident decisions on court.',items:['Dinks, drops & volleys','Shot selection & control','Movement & point construction'],cta:'Build your next level',subject:'intermediate coaching'},
     {number:'03',icon:<Users size={28}/>,label:'SHARE THE COURT',title:'Learn together',description:'Bring a friend or your playing partners. Work on your game with a little friendly encouragement.',items:['Shared skills & practice','Communication & teamwork','Guided rallies & game play'],cta:'Plan a session',subject:'coaching with friends'},
    ].map(program => <article className="program-card" key={program.number}><div className="program-top">{program.icon}<span>{program.number}</span></div><p className="tiny-label">{program.label}</p><h3>{program.title}</h3><p>{program.description}</p><ul>{program.items.map(item=><li key={item}><Check size={15}/>{item}</li>)}</ul><a href={`sms:+639760242712?body=${encodeURIComponent(`Hi Coach Jeremy! I'm interested in ${program.subject}. Could you share your availability, rates, and training locations?`)}`}>{program.cta}<ArrowUpRight size={20}/></a></article>)}</div>
    <p className="program-note">Not sure where to start? <a href="#contact">Let’s talk about your game <ArrowRight size={14}/></a></p>
   </div></section>
   <section className="practice-section"><div className="practice-image"><img src="/media/lesson.webp" loading="lazy" alt="Jeremy demonstrating a shot to a player during a lesson"/><button className="large-play" onClick={() => setVideoOpen(true)} aria-label="Watch the drill video"><Play size={28} fill="currentColor"/></button><span className="video-label">A LITTLE LOOK AT THE WORK <span>↗</span></span></div><div className="practice-copy"><p className="eyebrow">THE PROCESS IS THE PROGRESS</p><h2>Less overthinking.<br/>More <em>good reps.</em></h2><p>Simple cues. Focused practice. Time to put it all into play. That’s how we turn “I think I’ve got it” into “I’ve got this.”</p><div className="process"><div><span>01</span><p><strong>Understand it.</strong>Break the skill down.</p></div><div><span>02</span><p><strong>Practice it.</strong>Build the feeling with repetition.</p></div><div><span>03</span><p><strong>Play it.</strong>Bring it into your next rally.</p></div></div><button className="text-link light-link" onClick={()=>setVideoOpen(true)}>Watch a drill session <ArrowUpRight size={19}/></button></div></section>
   <section id="moments" className="gallery-section container section-space"><div className="section-heading"><div><p className="eyebrow dark-eyebrow">03 / BEYOND THE SCOREBOARD</p><h2>Good people.<br/><em>Great court time.</em></h2></div><p>The drills, the small wins, and the people<br className="desktop-break"/> who make coming back easy.</p></div><div className="gallery-filters" role="group" aria-label="Filter coaching photos">{['All moments','On the court','Our community'].map(category=><button key={category} aria-pressed={filter===category} className={filter===category?'active':''} onClick={()=>setFilter(category)}>{category}</button>)}</div><div className="gallery-grid">{photos.map((photo,index)=>(filter==='All moments'||filter===photo.category)&&<button key={photo.src} className={`gallery-photo photo-${photo.src}`} onClick={()=>setSelected(index)} aria-label={`View photo: ${photo.title}`}><img src={`/media/${photo.src}.webp`} alt={photo.title} loading="lazy"/><span className="gallery-overlay"><span>{photo.title}</span><ArrowUpRight size={23}/></span><span className="expand-mark" aria-hidden="true"><ArrowUpRight size={19}/></span></button>)}</div><div className="community-note"><Award size={22}/><p>Proud to be part of the <strong>Philippine Pickleball Academy</strong> coaching community.</p></div></section>
   <section className="faq-section section-space"><div className="container faq-layout"><div><p className="eyebrow dark-eyebrow">BEFORE WE HIT THE COURT</p><h2>A few things<br/><em>to know.</em></h2></div><div className="faq-list">{[
    ['I’ve never played. Can I start here?','Absolutely. We’ll start with the rules, scoring, paddle grip, and simple shots. You don’t need experience—just a willingness to learn.'],
    ['What should I bring?','Wear comfortable sportswear and shoes suitable for court movement. Bring water, a towel, and your paddle if you have one. If you need equipment, mention it when you enquire so we can discuss what’s available.'],
    ['Where and when are sessions held?','Get in touch with your preferred area and schedule. We’ll confirm the training venue, available times, and session details together before booking.'],
    ['How much does coaching cost?','Message me with your experience level and whether you’d like to train on your own or with others. I’ll share the relevant rates and what’s included before you book.'],
   ].map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
   <section id="contact" className="contact-section"><div className="container contact-inner"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS ON COURT</p><h2>Let’s make your<br/>next rally <em>better.</em></h2><p>First time or next level, there’s a place for you here.<br/>Tell me a little about your game. We’ll take it from there.</p><div className="contact-actions"><a className="button button-lime" href={`sms:+639760242712?body=${encodeURIComponent('Hi Coach Jeremy! I would like to enquire about pickleball coaching. My experience level is: __. My preferred area and schedule are: __. Could you share your rates and availability?')}`}>Enquire about a session <ArrowUpRight size={20}/></a><a className="phone-link" href="tel:+639760242712"><Phone size={17}/> 0976 024 2712</a></div><span className="contact-note">Let’s confirm your schedule, venue, and goals together.</span></div><div className="court-art" aria-hidden="true"><div className="court-outline"><div className="court-center"/><div className="court-kitchen"/><div className="court-net"/></div><img src="/favicon.svg" alt=""/><span>SEE YOU<br/>ON COURT.</span></div></div></section>
   <footer className="site-footer container"><a className="footer-brand" href="#">COACH JEREMY<span>LEARN / PLAY / IMPROVE</span></a><p>© {new Date().getFullYear()} Jeremy Capocyan</p><a href="#" className="back-top">Back to top <ArrowUpRight size={17}/></a></footer>
  </main>
  <dialog ref={dialog} className="media-dialog" onCancel={closeModal} onClick={event => { if(event.target === event.currentTarget) closeModal(); }} aria-label={videoOpen ? 'Coach Jeremy drill video' : 'Coaching photo'}><button className="modal-close" onClick={closeModal} aria-label="Close media"><X/></button>{videoOpen ? <video src="/media/drills.mp4" controls playsInline autoPlay aria-label="Pickleball drills with Coach Jeremy"/> : selected !== null && <figure><img src={`/media/${photos[selected].src}.webp`} alt={photos[selected].title}/><figcaption>{photos[selected].title}</figcaption></figure>}</dialog>
 </>;
}
