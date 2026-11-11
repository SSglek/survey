const db = require('./db/database');
const crypto = require('crypto');

try {
  // 1. Гарантуємо наявність колонки external_id
  try { db.prepare("ALTER TABLE surveys ADD COLUMN external_id TEXT").run(); } catch(e){}

  // 2. Видаляємо всі збиті/зіпсовані записи Typeform
  db.prepare("DELETE FROM surveys WHERE external_id = 'kplWf8d6' OR title LIKE '%Typeform%'").run();

  // 3. Створюємо новий чистий запис
  const surveyId = crypto.randomBytes(8).toString('hex');
  const title = "Якість навчання в РДГУ: оцінка та побажання (Typeform)";
  const description = "Опитування на платформі Typeform, інтегроване через Webhook";
  const externalId = "kplWf8d6";

  const questions = [
    { id: "overall_quality", text: "Як ви загалом оцінюєте якість навчання в РДГУ за останній семестр?", type: "scale" },
    { id: "rating_reason", text: "Що найбільше вплинуло на вашу загальну оцінку якості навчання?", type: "text" },
    { id: "teaching_clarity", text: "Наскільки зрозуміло викладачі пояснюють навчальний матеріал?", type: "scale" },
    { id: "practical_preparation", text: "Наскільки навчання допомагає вам розвивати практичні навички за обраною спеціальністю?", type: "scale" },
    { id: "study_workload", text: "Яким було ваше навчальне навантаження протягом останнього семестру?", type: "multiple_choice" },
    { id: "assessment_transparency", text: "Наскільки зрозумілими для вас були критерії оцінювання навчальних робіт?", type: "multiple_choice" },
    { id: "learning_barriers", text: "Що ускладнювало ваше навчання протягом останнього семестру?", type: "multiple_choice" },
    { id: "improvement_priorities", text: "Які напрями покращення навчання в РДГУ є для вас пріоритетними?", type: "multiple_choice" },
    { id: "specific_suggestions", text: "Яку конкретну зміну ви запропонували б для покращення навчання в РДГУ?", type: "text" },
    { id: "additional_wishes", text: "Які ще побажання, ідеї або позитивні практики ви хотіли б відзначити?", type: "text" }
  ];

  db.prepare(`
    INSERT INTO surveys (id, title, description, questions, external_id, created_at)
    VALUES (?, ?, ?, ?, ?, DATETIME('now'))
  `).run(surveyId, title, description, JSON.stringify(questions), externalId);

  // 4. Прив'язуємо всі збережені відповіді від Typeform до цього нового ID
  const updatedResponses = db.prepare("UPDATE responses SET survey_id = ? WHERE source = 'typeform' OR voter_hash LIKE 'typeform%'").run(surveyId);

  console.log(`УСПІХ! Створено опитування ID: ${surveyId}`);
  console.log(`Прив'язано існуючих відповідей Typeform: ${updatedResponses.changes}`);
} catch (err) {
  console.error("Помилка:", err.message);
}