const db = require('./db/database');

// Оновлюємо структуру питань у БД під точні типи відповідей з Typeform
const correctQuestions = [
  { id: "overall_quality", text: "Як ви загалом оцінюєте якість навчання в РДГУ за останній семестр?", type: "scale" },
  { id: "rating_reason", text: "Що найбільше вплинуло на вашу загальну оцінку якості навчання?", type: "text" },
  { id: "teaching_clarity", text: "Наскільки зрозуміло викладачі пояснюють навчальний матеріал?", type: "scale" },
  { id: "practical_preparation", text: "Наскільки навчання допомагає вам розвивати практичні навички?", type: "scale" },
  { id: "study_workload", text: "Яким було ваше навчальне навантаження протягом останнього семестру?", type: "multiple_choice", options: [
      "Значно меншим, ніж я міг/могла опанувати",
      "Дещо меншим, ніж я міг/могла опанувати",
      "Оптимальним для мене",
      "Дещо надмірним",
      "Значно надмірним",
      "Важко відповісти"
  ]},
  { id: "assessment_transparency", text: "Наскільки зрозумілими для вас були критерії оцінювання?", type: "multiple_choice", options: [
      "Цілком зрозумілими",
      "Переважно зрозумілими",
      "Частково зрозумілими",
      "Переважно незрозумілими",
      "Зовсім незрозумілими",
      "Важко відповісти"
  ]},
  { id: "learning_barriers", text: "Що ускладнювало ваше навчання протягом останнього семестру?", type: "multiple_choice" },
  { id: "improvement_priorities", text: "Які напрями покращення навчання в РДГУ є для вас пріоритетними?", type: "multiple_choice" },
  { id: "specific_suggestions", text: "Яку конкретну зміну ви запропонували б для покращення навчання?", type: "text" },
  { id: "additional_wishes", text: "Які ще побажання, ідеї або позитивні практики ви хотіли б відзначити?", type: "text" }
];

try {
  // Оновлюємо схему питань для Typeform-опитування
  const res = db.prepare(`
    UPDATE surveys 
    SET questions = ? 
    WHERE external_id = 'kplWf8d6' OR title LIKE '%Typeform%'
  `).run(JSON.stringify(correctQuestions));

  console.log("УСПІХ! Схему опитування очищено й оновлено. Змінено записів:", res.changes);
} catch (err) {
  console.error("Помилка:", err.message);
}