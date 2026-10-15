import { randomBytes,scryptSync } from 'node:crypto';
import { writeFileSync,mkdirSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
if(!process.stdin.isTTY)throw new Error('Run this in an interactive terminal; passwords are never command-line arguments.');
async function hidden(prompt){
 process.stdout.write(prompt);emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise(resolve=>{
  let value='';const listener=(str,key)=>{
   if(key?.ctrl&&key.name==='c'){process.stdin.setRawMode(false);process.exit(130);}
   if(key?.name==='return'){process.stdin.off('keypress',listener);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value);}
   else if(key?.name==='backspace')value=value.slice(0,-1);
   else if(str&&!key?.ctrl&&![...str].some(c=>c<' '))value+=str;
  };process.stdin.on('keypress',listener);
 });
}
let password;
while(true){
 password=await hidden('Choose your admin password (16–256 characters, hidden): ');
 if(password.length<16||password.length>256){console.log('Please use 16–256 characters. Try again below.');continue;}
 if(password!==await hidden('Confirm password (hidden): ')){console.log('Passwords did not match. Try again below.');continue;}
 break;
}
const salt=randomBytes(16).toString('hex');
const values=`ADMIN_EMAIL=yourvajeremyalonzo@gmail.com\nALERT_EMAIL=yourvajeremyalonzo@gmail.com\nSITE_URL=https://coach-jeremy.vercel.app\nADMIN_PASSWORD_HASH=scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}\nADMIN_SESSION_SECRET=${randomBytes(48).toString('base64url')}\n`;
mkdirSync('.sites-runtime',{recursive:true});
writeFileSync('.sites-runtime/vercel-admin.env',values,{mode:0o600});
console.log('Saved admin configuration to .sites-runtime/vercel-admin.env (Git-ignored). Import these values into Vercel Production environment variables, then redeploy. Your password was not stored.');
