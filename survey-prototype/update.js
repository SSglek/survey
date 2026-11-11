const db = require('./db/database');

try {
  // 1. Додаємо колонку external_id у таблицю surveys (якщо її ще немає)
  try {
    db.prepare("ALTER TABLE surveys ADD COLUMN external_id TEXT").run();
    console.log("Колонку external_id успішно додано до таблиці surveys!");
  } catch (e) {
    if (e.message.includes("duplicate column name")) {
      console.log("Колонка external_id вже існує.");
    } else {
      throw e;
    }
  }

  // 2. Прив'язуємо ID форми Typeform (kplWf8d6) до першого опитування
  const result = db.prepare("UPDATE surveys SET external_id='kplWf8d6' WHERE id=(SELECT id FROM surveys LIMIT 1)").run();
  console.log("Оновлено записів у БД:", result.changes);

} catch (err) {
  console.error("Помилка:", err.message);
}