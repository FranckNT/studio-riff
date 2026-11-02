import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from '../src/config.js';

const dir = new URL('../migrations/', import.meta.url);
export async function migrate(databaseUrl = config.databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      await client.query('BEGIN');
      try {
        await client.query(await readFile(new URL(file, dir), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`migration appliquée : ${file}`);
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    }
  } finally { await client.end(); }
}
if (import.meta.url === `file://${process.argv[1]}`) await migrate();
