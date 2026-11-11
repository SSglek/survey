const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─────────────────────────────────────────────
// POST /api/webhook/typeform
// Typeform надсилає сюди відповідь автоматично
// ─────────────────────────────────────────────
router.post('/typeform', (req, res) => {
  try {
    const payload = req.body;

    // Typeform передає відповіді у form_response.answers
    const formId  = payload?.form_response?.form_id;
    const answers = {};

    if (!formId) {
      return res.status(400).json({ error: 'Невірний формат Typeform payload' });
    }

    payload.form_response.answers.forEach(a => {
      const key = a.field.ref;   // ref = назва поля з Typeform
      // Typeform може передавати різні типи відповідей
      answers[key] =
        a.text           ??   // текстова відповідь
        a.choice?.label  ??   // один варіант
        a.choices?.labels ??  // кілька варіантів
        a.number          ??  // число / шкала
        a.boolean         ??  // так/ні
        null;
    });

    // Знайти опитування в нашій БД за зовнішнім id Typeform
    // (треба заздалегідь прив'язати — дивись Крок 3)
    const survey = db.prepare(
      'SELECT id FROM surveys WHERE external_id = ?'
    ).get(formId);

    if (!survey) {
      // Якщо опитування не прив'язане — зберігаємо з formId як survey_id
      // Можна потім прив'язати вручну через адмін-панель
      console.log(`⚠️  Typeform form_id ${formId} не прив'язаний до опитування`);
      return res.sendStatus(200); // Typeform чекає 200, інакше буде повторювати
    }

    db.prepare(`
      INSERT INTO responses (id, survey_id, answers, voter_hash)
      VALUES (?, ?, ?, ?)
    `).run(
      genId(),
      survey.id,
      JSON.stringify(answers),
      'typeform-webhook'   // немає email → ставимо мітку джерела
    );

    console.log(`✅  Typeform відповідь збережена для опитування ${survey.id}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// ─────────────────────────────────────────────
// POST /api/webhook/google
// Google Forms → Apps Script → сюди
// ─────────────────────────────────────────────
router.post('/google', (req, res) => {
  try {
    const { formId, answers } = req.body;

    if (!formId || !answers) {
      return res.status(400).json({ error: 'Невірний формат' });
    }

    const survey = db.prepare(
      'SELECT id FROM surveys WHERE external_id = ?'
    ).get(formId);

    if (!survey) {
      console.log(`⚠️  Google form_id ${formId} не прив'язаний до опитування`);
      return res.sendStatus(200);
    }

    db.prepare(`
      INSERT INTO responses (id, survey_id, answers, voter_hash)
      VALUES (?, ?, ?, ?)
    `).run(genId(), survey.id, JSON.stringify(answers), 'google-webhook');

    console.log(`✅  Google Forms відповідь збережена для опитування ${survey.id}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
