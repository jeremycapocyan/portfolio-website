import { createClient, type Client, type InValue } from '@libsql/client';
import type { Database, Statement } from '../worker/types';

// Preserve the shared booking engine's atomic batches on Turso/libSQL.
export function databaseAdapter(client:Client):Database {
 class Query implements Statement {
  constructor(readonly sql:string,readonly args:InValue[]=[]){}
  bind(...args:unknown[]){return new Query(this.sql,args as InValue[]);}
  async first<T>(){const result=await client.execute(this);return (result.rows[0] as T|undefined)??null;}
  async all<T>(){const result=await client.execute(this);return {results:result.rows as T[],meta:{changes:result.rowsAffected}};}
  async run(){const result=await client.execute(this);return {meta:{changes:result.rowsAffected}};}
 }
 return {prepare:sql=>new Query(sql),async batch(statements){
  if(!statements.every(s=>s instanceof Query))throw new Error('Invalid database batch');
  const results=await client.batch(statements as Query[],'write');
  return results.map(r=>({meta:{changes:r.rowsAffected}}));
 }};
}
let database:Database|undefined;
export function productionDatabase(){
 if(database)return database;
 const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
 if(!url||!authToken||!/^libsql:\/\//.test(url))throw new Error('Turso is not configured');
 database=databaseAdapter(createClient({url,authToken,intMode:'number'}));
 return database;
}
