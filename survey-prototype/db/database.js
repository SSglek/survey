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
    external_id TEXT DEFAULT NULL,  -- id форми з Typeform або Google Forms
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- Відповіді респондентів
  -- ВАЖЛИВО: email тут ВІДСУТНІЙ — лише хеш для контролю унікальності
  CREATE TABLE IF NOT EXISTS responses (
    id           TEXT PRIMARY KEY,
    survey_id    TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    answers      TEXT NOT NULL,
    voter_hash   TEXT NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  -- Використані хеші для блокування повторного проходження
  -- PRIMARY KEY (hash, survey_id) — один і той самий email може пройти різні опитування
  CREATE TABLE IF NOT EXISTS used_hashes (
    hash       TEXT NOT NULL,
    survey_id  TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (hash, survey_id)
  );
`);

module.exports = db;
