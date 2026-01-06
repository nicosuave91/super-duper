import { Pool } from "pg";
import { loadCoreEnv } from "./env";

const env = loadCoreEnv();

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function tx<T>(
  fn: (q: (text: string, params?: any[]) => Promise<any[]>) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const q = async (text: string, params?: any[]) => (await client.query(text, params)).rows;
    const out = await fn(q);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
