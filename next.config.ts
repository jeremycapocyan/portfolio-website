import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', images: { unoptimized: true }, devIndicators: false,
 ...(process.env.NODE_ENV==='development'?{rewrites:async()=>[{source:'/api/:path*',destination:'http://127.0.0.1:8787/api/:path*'}]}:{})
};
export default config;
