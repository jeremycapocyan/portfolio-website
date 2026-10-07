import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Coach Jeremy Capocyan | Pickleball Coach', description: 'Learn, play, and improve with Jeremy Capocyan, a PhPA Level 1 certified pickleball coach. Personal coaching for beginner and intermediate players.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
