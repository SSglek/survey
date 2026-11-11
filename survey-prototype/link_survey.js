const db = require('./db/database');

try {
  // 1. Перевіряємо/додаємо колонку external_id
  try {
    db.prepare("ALTER TABLE surveys ADD COLUMN external_id TEXT").run();
  } catch (e) {}

  // 2. Додаємо external_id='kplWf8d6' для першого опитування в БД
  const res = db.prepare("UPDATE surveys SET external_id='kplWf8d6' WHERE id=(SELECT id FROM surveys LIMIT 1)").run();
  
  if (res.changes > 0) {
    console.log("УСПІХ: Typeform (kplWf8d6) прив'язано до опитування в БД!");
  } else {
    console.log("ПОМИЛКА: У БД немає жодного опитування! Створіть хоча б одне опитування через сайт або конструктор.");
  }
} catch (err) {
  console.error("Помилка:", err.message);
}