const db = require('./db/database');
const crypto = require('crypto');

const surveyId = crypto.randomBytes(8).toString('hex');
const title = "Якість навчання в РДГУ: оцінка та побажання (Typeform)";
const description = "Опитування створене на платформі Typeform та інтегроване через Webhook";
const externalId = "kplWf8d6";

// Структура питань для модуля аналітики на твоєму сайті
const questions = [
  { id: "overall_quality", text: "Як ви загалом оцінюєте якість навчання в РДГУ?", type: "scale" },
  { id: "rating_reason", text: "Що найбільше вплинуло на вашу оцінку?", type: "text" },
  { id: "teaching_clarity", text: "Зрозумілість пояснення матеріалу викладачами", type: "scale" },
  { id: "practical_preparation", text: "Розвиток практичних навичок", type: "scale" },
  { id: "study_workload", text: "Навчальне навантаження", type: "multiple_choice", options: [
      "Значно меншим, ніж я міг/могла опанувати",
      "Дещо меншим, ніж я міг/могла опанувати",
      "Оптимальним для мене",
      "Дещо надмірним",
      "Значно надмірним",
      "Важко відповісти"
  ]},
  { id: "assessment_transparency", text: "Критерії оцінювання", type: "multiple_choice", options: [
      "Цілком зрозумілими",
      "Переважно зрозумілими",
      "Частково зрозумілими",
      "Переважно незрозумілими",
      "Зовсім незрозумілими",
      "Важко відповісти"
  ]},
  { id: "learning_barriers", text: "Що ускладнювало навчання", type: "multiple_choice" },
  { id: "improvement_priorities", text: "Пріоритетні напрями покращення", type: "multiple_choice" },
  { id: "specific_suggestions", text: "Конкретні пропозиції щодо змін", type: "text" },
  { id: "additional_wishes", text: "Додаткові побажання та ідеї", type: "text" }
];

try {
  db.prepare(`
    INSERT INTO surveys (id, title, description, questions, external_id, created_at)
    VALUES (?, ?, ?, ?, ?, DATETIME('now'))
  `).run(surveyId, title, description, JSON.stringify(questions), externalId);

  console.log("Опитування з Typeform успішно додано до списку на сайті!");
} catch (err) {
  console.error("Помилка:", err.message);
}