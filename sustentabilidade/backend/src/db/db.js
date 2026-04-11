import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbInstance = null;

/**
 * @param {{ databasePath: string }} config
 */
export function getDb(config) {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(config.databasePath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(config.databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db, path.join(__dirname, 'migrations'));

  dbInstance = db;
  return db;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
