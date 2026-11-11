const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// POST /api/responses — надіслати відповідь
router.post('/', (req, res) => {
  const { surveyId, answers, voterHash } = req.body;

  if (!surveyId || !answers || !voterHash)
    return res.status(400).json({ error: 'Відсутні обов\'язкові поля' });

  const survey = db.prepare('SELECT id FROM surveys WHERE id = ?').get(surveyId);
  if (!survey) return res.status(404).json({ error: 'Опитування не знайдено' });

  // Подвійна перевірка хешу на сервері (захист від прямих POST-запитів)
  const alreadyUsed = db.prepare(
    'SELECT 1 FROM used_hashes WHERE hash = ? AND survey_id = ?'
  ).get(voterHash, surveyId);

  if (alreadyUsed)
    return res.status(409).json({ error: 'Ця пошта вже використовувалась для цього опитування' });

  // Транзакція: відповідь + хеш зберігаються разом або не зберігаються взагалі
  db.transaction(() => {
    db.prepare(
      'INSERT INTO responses (id, survey_id, answers, voter_hash, source) VALUES (?, ?, ?, ?, ?)'
    ).run(genId(), surveyId, JSON.stringify(answers), voterHash, 'site');

    db.prepare(
      'INSERT INTO used_hashes (hash, survey_id) VALUES (?, ?)'
    ).run(voterHash, surveyId);
  })();

  res.status(201).json({ ok: true });
});

// GET /api/responses/:surveyId — результати (voter_hash НЕ передається)
router.get('/:surveyId', (req, res) => {
  const rows = db.prepare(`
    SELECT id, answers, submitted_at
    FROM responses
    WHERE survey_id = ?
    ORDER BY submitted_at ASC
  `).all(req.params.surveyId);

  res.json(rows.map(r => ({ ...r, answers: JSON.parse(r.answers) })));
});

module.exports = router;
