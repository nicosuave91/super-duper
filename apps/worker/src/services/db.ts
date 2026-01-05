import pg from "pg";

const { Pool } = pg;

export type Db = {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  close: () => Promise<void>;
};

export function createDb(): Db {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  return {
    query: (sql, params) => pool.query(sql, params),
    close: () => pool.end(),
  };
}
