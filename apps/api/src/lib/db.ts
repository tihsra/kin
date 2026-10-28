import { createRequire } from 'node:module';
import { config } from '../config.ts';
import type { Pool, Database } from '../models/types.ts';

const require = createRequire(import.meta.url);
let driver: { Pool: new (options: Record<string, unknown>) => Pool };
try {
  driver = require('pg');
} catch {
  throw new Error('PostgreSQL driver is missing. Run npm install pg --workspace @kin/api.');
}
export function createDatabasePool(connectionString = config.DATABASE_URL): Pool {
  const connection = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)) {
    throw new Error('Use a PostgreSQL connection string for DATABASE_URL.');
  }
  if (config.DATABASE_SSL === 'true') {
    for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
      connection.searchParams.delete(key);
  }
  const pool: Pool = new driver.Pool({
    connectionString: connection.toString(),
    ssl: config.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
    max: 12,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  pool.on('error', (error: Error) => {
    console.error(JSON.stringify({ event: 'database_connection_error', message: error.message }));
  });
  return pool;
}
export const db = createDatabasePool();

export async function transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
