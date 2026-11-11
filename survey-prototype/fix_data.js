const db = require('./db/database');

try {
  // 1. Шукаємо опитування Typeform
  const tfSurvey = db.prepare("SELECT id FROM surveys WHERE title LIKE '%Typeform%' OR external_id='kplWf8d6' LIMIT 1").get();

  if (tfSurvey) {
    // 2. Гарантуємо, що у нього стоїть external_id='kplWf8d6'
    db.prepare("UPDATE surveys SET external_id='kplWf8d6' WHERE id=?").run(tfSurvey.id);

    // 3. Перев'язуємо всі відповіді з Typeform до цього опитування
    const updated = db.prepare("UPDATE responses SET survey_id=? WHERE source='typeform' OR voter_hash LIKE 'typeform%' OR id LIKE 'typeform%'").run(tfSurvey.id);

    console.log(`УСПІХ! Перев'язано відповідей: ${updated.changes} до опитування ID: ${tfSurvey.id}`);
  } else {
    console.log("Опитування Typeform не знайдено в БД.");
  }
} catch (err) {
  console.error("Помилка виконання:", err.message);
}