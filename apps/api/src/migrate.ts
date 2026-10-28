import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createDatabasePool } from './lib/db.ts';
import { config } from './config.ts';

const url = config.DATABASE_DIRECT_URL || config.DATABASE_URL;
if (new URL(url).hostname.includes('-pooler.'))
  throw new Error('Set DATABASE_DIRECT_URL to the unpooled Neon connection string for migrations.');
const db = createDatabasePool(url);

const directory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url));
const connection = await db.connect();
try {
  await connection.query(`SELECT pg_advisory_lock(772103)`);
  await connection.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())',
  );
  for (const name of (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort()) {
    if (
      (await connection.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rowCount
    )
      continue;
    await connection.query('BEGIN');
    try {
      await connection.query(await readFile(`${directory}/${name}`, 'utf8'));
      await connection.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await connection.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await connection.query('SELECT pg_advisory_unlock(772103)');
  connection.release();
  await db.end();
}
