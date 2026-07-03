import { Pool, PoolClient } from 'pg';

// Connection pool configuration for production scale (100+ tenants).
// Set DATABASE_URL's own ?connection_limit= or PGPOOL_MAX to size this.
const MAX_CONNECTIONS = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAX_CONNECTIONS,
});

export async function query<T extends object = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T extends object = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a single transaction on a dedicated client (BEGIN / COMMIT
 * / ROLLBACK), mirroring Prisma's `$transaction(async (tx) => ...)`.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
