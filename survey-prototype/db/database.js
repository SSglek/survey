const Database = require('better-sqlite3');
const path     = require('path');

// Файл бази даних — survey.db у папці db/
const db = new Database(path.join(__dirname, 'survey.db'));

// Оптимізація продуктивності SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ───────────────────────────────────────────────
// СТВОРЕННЯ ТАБЛИЦЬ (якщо ще не існують)
// ───────────────────────────────────────────────
db.exec(`
  -- Опитування
  CREATE TABLE IF NOT EXISTS surveys (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    questions   TEXT NOT NULL,
    external_id TEXT DEFAULT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Відповіді респондентів
  CREATE TABLE IF NOT EXISTS responses (
    id           TEXT PRIMARY KEY,
    survey_id    TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    answers      TEXT NOT NULL,
    voter_hash   TEXT NOT NULL,
    user_id      TEXT DEFAULT NULL,
    source       TEXT DEFAULT 'site',
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  -- Використані хеші для блокування повторного проходження
  CREATE TABLE IF NOT EXISTS used_hashes (
    hash       TEXT NOT NULL,
    survey_id  TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (hash, survey_id)
  );
`);

const responseColumns = db.prepare('PRAGMA table_info(responses)').all();
if (!responseColumns.some(col => col.name === 'user_id')) {
  db.exec('ALTER TABLE responses ADD COLUMN user_id TEXT DEFAULT NULL;');
}
if (!responseColumns.some(col => col.name === 'source')) {
  db.exec('ALTER TABLE responses ADD COLUMN source TEXT DEFAULT "site";');
}

module.exports = db;
