const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// Генератор ID для запису в БД
function genId() {
  return crypto.randomBytes(8).toString('hex');
}

// Обробка webhook від Typeform
router.post('/typeform', (req, res) => {
  try {
    const payload = req.body;

    // Перевіряємо, чи це повноцінна відповідь на форму
    if (!payload.form_response) {
      return res.status(200).json({ ok: true, message: 'Event ignored (not a form_response)' });
    }

    const formId = payload.form_response.form_id; // "kplWf8d6"
    const rawAnswers = payload.form_response.answers || [];

    // Шукаємо прив'язане опитування за external_id
    const survey = db.prepare('SELECT id FROM surveys WHERE external_id = ?').get(formId);

    if (!survey) {
      console.warn(`[Typeform Webhook] Опитування з external_id='${formId}' не знайдено в БД.`);
      return res.status(404).json({ error: 'Survey not found for this external_id' });
    }

    const parsedAnswers = {};

    // Парсимо кожен тип відповіді відповідно до payload
    rawAnswers.forEach(a => {
      const key = a.field.ref || a.field.id;

      if (a.type === 'number') {
        // Оціночна шкала (1-5)
        parsedAnswers[key] = a.number;
      } else if (a.type === 'text') {
        // Текстові відповіді (long_text)
        parsedAnswers[key] = a.text;
      } else if (a.type === 'choice') {
        // Один варіант вибору
        parsedAnswers[key] = a.choice.label;
      } else if (a.type === 'choices') {
        // Кілька варіантів вибору (зберігаємо масивом або через кому)
        parsedAnswers[key] = a.choices.labels;
      }
    });

    // Зберігаємо відповідь у базу SQLite
    const responseId = genId();
    const voterHash = 'typeform_' + (payload.form_response.token || genId());

    db.prepare(`
      INSERT INTO responses (id, survey_id, answers, voter_hash , source)
      VALUES (?, ?, ?, ?, 'typeform')
    `).run(responseId, survey.id, JSON.stringify(parsedAnswers), voterHash);

    console.log(`[Typeform Webhook] Успішно збережено відповідь ID: ${responseId} для опитування: ${survey.id}`);
    
    return res.status(200).json({ ok: true, responseId });
  } catch (err) {
    console.error('[Typeform Webhook Error]:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Обробка webhook від Google Forms (Apps Script)
router.post('/google', (req, res) => {
  try {
    const { formId, answers } = req.body;

    const survey = db.prepare('SELECT id FROM surveys WHERE external_id = ?').get(formId);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const responseId = genId();
    db.prepare(`
      INSERT INTO responses (id, survey_id, answers, voter_hash)
      VALUES (?, ?, ?, ?)
    `).run(responseId, survey.id, JSON.stringify(answers), 'google_forms_' + genId());

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Google Webhook Error]:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;