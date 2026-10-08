import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
// Local development/tests only. Production schema changes are applied by Sites.
export function database(filename=':memory:'){
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;
  sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(`drizzle/${name}`,'utf8'));sqlite.prepare('INSERT INTO _local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
 class Statement{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Statement(this.sql,values);}
  execute(){const result=sqlite.prepare(this.sql).run(...this.values);return{meta:{changes:Number(result.changes)}};}
  async run(){return this.execute();}
  async first(){return sqlite.prepare(this.sql).get(...this.values)||null;}
  async all(){return{results:sqlite.prepare(this.sql).all(...this.values),meta:{changes:0}};}
 }
 return{prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close(),sqlite};
}
