import { desktop } from "@chain/sdk";
import type { Migration, StorageApi } from "@chain/sdk";

import { MIGRATIONS } from "@/shared/lib/db/schema";

const ELECTRON_IMPORTS = `
  CREATE TABLE electron_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_folder TEXT NOT NULL,
    source_schema_version INTEGER NOT NULL,
    imported_at TEXT NOT NULL,
    counts TEXT NOT NULL
  );
`;

export const APP_MIGRATIONS: Migration[] = [
	...MIGRATIONS.map((sql, index) => ({ version: index + 1, name: `electron-step-${index + 1}`, sql })),
	{ version: 6, name: "electron-imports", sql: ELECTRON_IMPORTS },
];

let ready: Promise<StorageApi> | null = null;

export function database(): Promise<StorageApi> {
	ready ??= desktop.storage.migrate(APP_MIGRATIONS).then(() => desktop.storage);

	return ready;
}
