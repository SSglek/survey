const db = require('./db/database');

try {
  // Додаємо колонку external_id, якщо її немає
  try { db.prepare("ALTER TABLE surveys ADD COLUMN external_id TEXT").run(); } catch(e){}
  
  // Прив'язуємо Typeform ID до опитування Typeform у вашій БД
  const res = db.prepare("UPDATE surveys SET external_id='kplWf8d6' WHERE title LIKE '%Typeform%' OR id=(SELECT id FROM surveys LIMIT 1)").run();
  
  console.log("УСПІХ: Прив'язано опитувань:", res.changes);
} catch (err) {
  console.error("Помилка:", err.message);
}