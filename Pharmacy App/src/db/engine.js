import initSqlJs from 'sql.js';
import { get, set } from 'idb-keyval';
import { SCHEMA_SQL } from './schema';
import { pushBackup, pullLatestBackup } from '../lib/sync';
import wasmAssetUrl from '../assets/wasm/sql-wasm-browser.wasm?url';

const IDB_KEY = 'pharmacy-app-db-v1';
let SQL = null;

// Resolves to a real file (dev/prod build) or a base64 data: URI (single-file
// artifact build, where assetsInlineLimit is raised). Decoding a data: URI
// directly and handing sql.js the raw bytes via `wasmBinary` — instead of
// letting it `fetch()` the URL itself — means this works even under a CSP
// that blocks fetch/XHR entirely, which the file-serving path would not.
async function loadWasmBinary(url) {
  if (url.startsWith('data:')) {
    const base64 = url.slice(url.indexOf(',') + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

function rowsFromResult(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export class Engine {
  constructor(sqlDb) {
    this.db = sqlDb;
    this.writeLock = Promise.resolve();
  }

  static async create() {
    if (!SQL) {
      const wasmBinary = await loadWasmBinary(wasmAssetUrl);
      SQL = await initSqlJs({ wasmBinary });
    }
    let bytes = await get(IDB_KEY);
    if (!bytes) {
      // Fresh/replacement device with no local copy — try restoring from the
      // sync server before falling back to a brand-new empty database.
      bytes = await pullLatestBackup();
    }
    const db = bytes ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database();
    db.run(SCHEMA_SQL);
    const tableInfo = rowsFromResult(
      db.exec(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'activity_log'`)
    );
    if (tableInfo.length > 0 && tableInfo[0].sql && !tableInfo[0].sql.includes("'STAFF'")) {
      db.run(`
        ALTER TABLE activity_log RENAME TO activity_log_old;
        CREATE TABLE activity_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('SALE','VOID','ADD_STOCK','ADJUST','PRICE','CLOSEOUT','LOGIN','STAFF')),
          table_affected TEXT NOT NULL,
          before_value TEXT,
          after_value TEXT,
          timestamp TEXT NOT NULL
        );
        INSERT INTO activity_log SELECT * FROM activity_log_old;
        DROP TABLE activity_log_old;
        CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log (timestamp);
      `);
    }
    const engine = new Engine(db);
    await engine.persist();
    return engine;
  }

  async persist() {
    const bytes = this.db.export();
    await set(IDB_KEY, bytes);
    pushBackup(bytes);
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  one(sql, params = []) {
    const rows = this.all(sql, params);
    return rows.length ? rows[0] : null;
  }

  run(sql, params = []) {
    this.db.run(sql, params);
  }

  /**
   * Serializes all writes through a single in-memory queue (sql.js has no real
   * concurrency, but async callers can interleave) and persists only after COMMIT,
   * so a mid-transaction crash never leaves a partially-applied write on reload.
   */
  async transaction(fn) {
    const run = async () => {
      this.db.run('BEGIN TRANSACTION');
      try {
        const result = await fn(this);
        this.db.run('COMMIT');
        await this.persist();
        return result;
      } catch (err) {
        this.db.run('ROLLBACK');
        throw err;
      }
    };
    const scheduled = this.writeLock.then(run, run);
    this.writeLock = scheduled.then(
      () => undefined,
      () => undefined
    );
    return scheduled;
  }

  logActivity({ userId, action, tableAffected, before, after, timestamp }) {
    this.run(
      `INSERT INTO activity_log (id, user_id, action, table_affected, before_value, after_value, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        userId,
        action,
        tableAffected,
        before == null ? null : JSON.stringify(before),
        after == null ? null : JSON.stringify(after),
        timestamp,
      ]
    );
  }
}

export { rowsFromResult };
