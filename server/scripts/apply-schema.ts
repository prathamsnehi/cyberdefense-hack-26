import { readFile } from 'node:fs/promises';
import { ch } from '../src/clickhouse';
try {
  const sql = await readFile(new URL('../schema/003_application.sql', import.meta.url), 'utf8');
  for (const query of sql.split(';').map(s => s.trim()).filter(Boolean)) await ch.command({ query });
  console.log('Application migration and payee seed applied.');
} finally { await ch.close(); }
