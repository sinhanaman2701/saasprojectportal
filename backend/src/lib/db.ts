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
 * Builds a `SET "col1" = $1, "col2" = $2, ...` clause plus its param array
 * from a plain object, so assigning the same column more than once (e.g.
 * setting isActive both directly and as a side effect of isArchived)
 * naturally overwrites rather than emitting a second `SET "col" = ...` for
 * the same column — Postgres rejects duplicate column assignments in one
 * UPDATE with "multiple assignments to same column".
 */
export function buildSetClause(columnValues: Record<string, unknown>, paramOffset = 0): { clause: string; params: unknown[] } {
  const columns = Object.keys(columnValues);
  const params = columns.map((col) => columnValues[col]);
  const clause = columns.map((col, i) => `"${col}" = $${paramOffset + i + 1}`).join(', ');
  return { clause, params };
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
