// apps/api/src/db.ts
import { Pool } from 'pg';
import { loadEnv } from './env';

const env = loadEnv();

// Prefer DATABASE_URL if present, otherwise build from discrete vars if you have them.
// Adjust if your env shape differs.
const connectionString =
  process.env.DATABASE_URL ||
  env.DATABASE_URL ||
  undefined;

export const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host: (env as any).DB_HOST ?? process.env.DB_HOST,
        port: Number((env as any).DB_PORT ?? process.env.DB_PORT ?? 5432),
        user: (env as any).DB_USER ?? process.env.DB_USER,
        password: (env as any).DB_PASSWORD ?? process.env.DB_PASSWORD,
        database: (env as any).DB_NAME ?? process.env.DB_NAME,
      }
);

export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function tx<T>(
  fn: (q: (text: string, params?: any[]) => Promise<any[]>) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const q = async (text: string, params?: any[]) =>
      (await client.query(text, params)).rows;
    const out = await fn(q);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}
