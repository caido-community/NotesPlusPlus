import { randomUUID } from "crypto";

import type { SDK } from "caido:plugin";
import type { SavedItem, SavedItemKind, SavedItemSourceKind } from "shared";

let initialized = false;

interface SavedItemRow {
  id: string;
  kind: string;
  ref_id: string | undefined;
  parent_request_id: string | undefined;
  source_kind: string;
  replay_session_id: string | undefined;
  session_label: string | undefined;
  draft_raw: string | undefined;
  draft_host: string | undefined;
  draft_port: number | undefined;
  draft_is_tls: number | undefined;
  label: string | undefined;
  project_id: string;
  created_at: string;
}

function rowToSavedItem(row: SavedItemRow): SavedItem {
  return {
    id: row.id,
    kind: row.kind as SavedItemKind,
    refId: row.ref_id ?? "",
    parentRequestId: row.parent_request_id ?? undefined,
    sourceKind: row.source_kind as SavedItemSourceKind,
    replaySessionId: row.replay_session_id ?? undefined,
    sessionLabel: row.session_label ?? undefined,
    draftRaw: row.draft_raw ?? undefined,
    draftHost: row.draft_host ?? undefined,
    draftPort: row.draft_port ?? undefined,
    draftIsTls:
      row.draft_is_tls === undefined ? undefined : row.draft_is_tls === 1,
    label: row.label ?? undefined,
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

/**
 * Get the plugin's SQLite database, creating the saved_items table
 * the first time it's needed. Also migrates existing installations that
 * were created before `replay_session_id` / `session_label` / the draft
 * columns existed.
 */
async function getDb(sdk: SDK) {
  const db = await sdk.meta.db();

  if (!initialized) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS saved_items (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        ref_id TEXT,
        parent_request_id TEXT,
        source_kind TEXT NOT NULL,
        label TEXT,
        project_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_saved_items_project
        ON saved_items (project_id);
    `);

    // Migration: add columns introduced after the initial release. SQLite
    // has no "ADD COLUMN IF NOT EXISTS", so failures here (column already
    // exists) are expected on every run after the first and are ignored.
    for (const column of [
      "replay_session_id TEXT",
      "session_label TEXT",
      "draft_raw TEXT",
      "draft_host TEXT",
      "draft_port INTEGER",
      "draft_is_tls INTEGER",
    ]) {
      try {
        await db.exec(`ALTER TABLE saved_items ADD COLUMN ${column};`);
      } catch {
        // Column already exists — nothing to do.
      }
    }

    // Migration: installs created before "draft" items existed have
    // `ref_id TEXT NOT NULL` baked into the table, which SQLite has no
    // `ALTER TABLE ... DROP NOT NULL` for — relaxing it requires
    // rebuilding the table (SQLite's documented approach for changing
    // column constraints). Only runs once, when needed.
    const columnsStatement = await db.prepare(
      "PRAGMA table_info(saved_items);",
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- same as getSavedItemRow: the `sqlite` package's types aren't resolvable here, so `all()` returns an untyped `object[]` and this cast is what actually narrows it.
    const columns = (await columnsStatement.all()) as Array<{
      name: string;
      notnull: number;
    }>;
    const refIdColumn = columns.find((c) => c.name === "ref_id");

    if (refIdColumn?.notnull === 1) {
      await db.exec(`
        BEGIN TRANSACTION;
        ALTER TABLE saved_items RENAME TO saved_items_old;
        CREATE TABLE saved_items (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          ref_id TEXT,
          parent_request_id TEXT,
          source_kind TEXT NOT NULL,
          replay_session_id TEXT,
          session_label TEXT,
          draft_raw TEXT,
          draft_host TEXT,
          draft_port INTEGER,
          draft_is_tls INTEGER,
          label TEXT,
          project_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO saved_items (
          id, kind, ref_id, parent_request_id, source_kind,
          replay_session_id, session_label, draft_raw, draft_host,
          draft_port, draft_is_tls, label, project_id, created_at
        )
        SELECT
          id, kind, ref_id, parent_request_id, source_kind,
          replay_session_id, session_label, draft_raw, draft_host,
          draft_port, draft_is_tls, label, project_id, created_at
        FROM saved_items_old;
        DROP TABLE saved_items_old;
        CREATE INDEX IF NOT EXISTS idx_saved_items_project
          ON saved_items (project_id);
        COMMIT;
      `);
    }

    initialized = true;
  }

  return db;
}

/**
 * Insert a new saved item (request, response, or unsent draft) and
 * return it.
 */
export async function insertSavedItem(
  sdk: SDK,
  params: {
    kind: SavedItemKind;
    refId: string;
    parentRequestId?: string;
    sourceKind: SavedItemSourceKind;
    replaySessionId?: string;
    sessionLabel?: string;
    draftRaw?: string;
    draftHost?: string;
    draftPort?: number;
    draftIsTls?: boolean;
    label: string | undefined;
    projectId: string;
  },
): Promise<SavedItem> {
  const db = await getDb(sdk);

  const item: SavedItem = {
    id: randomUUID(),
    kind: params.kind,
    refId: params.refId,
    parentRequestId: params.parentRequestId,
    sourceKind: params.sourceKind,
    replaySessionId: params.replaySessionId,
    sessionLabel: params.sessionLabel,
    draftRaw: params.draftRaw,
    draftHost: params.draftHost,
    draftPort: params.draftPort,
    draftIsTls: params.draftIsTls,
    label: params.label,
    projectId: params.projectId,
    createdAt: new Date().toISOString(),
  };

  const insertStatement = await db.prepare(
    `INSERT INTO saved_items (
       id, kind, ref_id, parent_request_id, source_kind,
       replay_session_id, session_label, draft_raw, draft_host,
       draft_port, draft_is_tls, label, project_id, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  await insertStatement.run(
    item.id,
    item.kind,
    item.refId || null,
    item.parentRequestId ?? null,
    item.sourceKind,
    item.replaySessionId ?? null,
    item.sessionLabel ?? null,
    item.draftRaw ?? null,
    item.draftHost ?? null,
    item.draftPort ?? null,
    item.draftIsTls === undefined ? null : item.draftIsTls ? 1 : 0,
    item.label ?? null,
    item.projectId,
    item.createdAt,
  );

  return item;
}

/**
 * Fetch a saved item by its own ID (not the underlying request/response ID).
 */
export async function getSavedItemRow(
  sdk: SDK,
  id: string,
): Promise<SavedItem | undefined> {
  const db = await getDb(sdk);

  const getStatement = await db.prepare(
    "SELECT * FROM saved_items WHERE id = ?",
  );
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- the `sqlite` package's types aren't resolvable here, so `get()` returns an untyped `object` and this cast is what actually narrows it to the real row shape.
  const row = (await getStatement.get(id)) as SavedItemRow | undefined;

  return row ? rowToSavedItem(row) : undefined;
}

/**
 * Delete a saved item by its own ID. Returns true if a row was deleted.
 */
export async function deleteSavedItemRow(
  sdk: SDK,
  id: string,
): Promise<boolean> {
  const db = await getDb(sdk);

  const deleteStatement = await db.prepare(
    "DELETE FROM saved_items WHERE id = ?",
  );
  const result = await deleteStatement.run(id);

  return (result.changes ?? 0) > 0;
}
