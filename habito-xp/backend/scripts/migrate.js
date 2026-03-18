import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const file = path.join(__dirname, '..', 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('Migração 001_initial.sql executada.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
