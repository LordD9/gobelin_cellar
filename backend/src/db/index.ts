import fs from 'fs';
import path from 'path';
import type sqlite3 from 'sqlite3';
import { SCHEMA_SQL } from './schema';
import { all, exec, get, openDatabase, run } from './client';

export type { RunResult } from './client';
export { all, exec, get, run };

const DEFAULT_LOCATION_NAME = 'Cave principale';

let db: sqlite3.Database | null = null;

export function getDb(): sqlite3.Database {
  if (!db) {
    throw new Error('La base de données n\'est pas initialisée. Appeler initDatabase() d\'abord.');
  }
  return db;
}

export function resolveDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }
  return path.resolve(__dirname, '../../data/cave.sqlite');
}

export async function initDatabase(dbPath = resolveDatabasePath()): Promise<sqlite3.Database> {
  const dataDir = path.dirname(dbPath);
  fs.mkdirSync(dataDir, { recursive: true });

  db = await openDatabase(dbPath);
  await exec(db, SCHEMA_SQL);
  await seedDefaultLocation(db);

  return db;
}

async function seedDefaultLocation(database: sqlite3.Database): Promise<void> {
  const existing = await get<{ count: number }>(
    database,
    'SELECT COUNT(*) AS count FROM locations',
  );
  if ((existing?.count ?? 0) > 0) {
    return;
  }

  await run(
    database,
    'INSERT INTO locations (name, description) VALUES (?, ?)',
    [DEFAULT_LOCATION_NAME, 'Emplacement par défaut'],
  );
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    const current = db;
    db = null;
    current.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function getTableNames(): Promise<string[]> {
  const rows = await all<{ name: string }>(
    getDb(),
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return rows.map((row) => row.name);
}
