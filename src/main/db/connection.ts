import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { runMigrations } from "./migrations";

/**
 * The app's SQLite database, opened once and migrated on the way.
 *
 * `node:sqlite` is Electron's own — real SQLite with no native module to
 * rebuild for each platform, which is the whole reason it is used here rather
 * than better-sqlite3.
 */

let db: DatabaseSync | null = null;

export function database(): DatabaseSync {
  if (db) return db;

  const file = path.join(app.getPath("userData"), "lazify.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  runMigrations(db);

  return db;
}

/** Lets tests run against a database of their own. */
export function useDatabase(instance: DatabaseSync): void {
  db = instance;
  runMigrations(instance);
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}
