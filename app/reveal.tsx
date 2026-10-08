'use client';
import { useEffect } from 'react';
export default function Reveal(){useEffect(()=>{
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('reveal-waiting');observer.unobserve(entry.target);}});},{threshold:0.08});
 const elements=document.querySelectorAll('.section-heading,.about-photo,.about-copy,.program-card,.pricing-card,.practice-copy,.booking-grid');
 elements.forEach(el=>{if(el.getBoundingClientRect().top>window.innerHeight){el.classList.add('reveal-waiting');observer.observe(el);}});
 return()=>{observer.disconnect();elements.forEach(el=>el.classList.remove('reveal-waiting'));};
},[]);return null;}
