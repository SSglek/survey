const db = require('./db/database');

try {
  db.prepare("ALTER TABLE responses ADD COLUMN source TEXT DEFAULT 'site'").run();
  console.log("УСПІХ: Колонку 'source' додано в таблицю responses!");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("Колонка 'source' вже існує в таблиці responses.");
  } else {
    console.error("Помилка при додаванні колонки:", e.message);
  }
}