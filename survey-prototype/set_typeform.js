const db = require('./db/database');

try {
  // Додаємо колонку, якщо її ще немає
  try {
    db.prepare("ALTER TABLE surveys ADD COLUMN external_id TEXT").run();
  } catch (e) {}

  // Прив'язуємо form_id з Typeform до першого опитування у вашій БД
  const result = db.prepare("UPDATE surveys SET external_id='kplWf8d6' WHERE id=(SELECT id FROM surveys LIMIT 1)").run();
  console.log('Успішно прив’язано! Змінено записів:', result.changes);
} catch (err) {
  console.error('Помилка:', err.message);
}