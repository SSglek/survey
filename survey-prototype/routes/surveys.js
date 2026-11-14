const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/surveys — список усіх опитувань
router.get('/', (req, res) => {
  const surveys = db.prepare(`
    SELECT s.id, s.title, s.description, s.questions, s.created_at,
           COUNT(r.id) AS response_count
    FROM surveys s
    LEFT JOIN responses r ON r.survey_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();

  res.json(surveys.map(s => ({ ...s, questions: JSON.parse(s.questions) })));
});

// GET /api/surveys/:id — одне опитування
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Опитування не знайдено' });
  res.json({ ...row, questions: JSON.parse(row.questions) });
});

// POST /api/surveys — створити
router.post('/', requireAdmin, (req, res) => {
  const { title, description, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'Невірні дані' });

  const id = genId();
  db.prepare(`INSERT INTO surveys (id, title, description, questions) VALUES (?, ?, ?, ?)`)
    .run(id, title.trim(), (description || '').trim(), JSON.stringify(questions));

  res.status(201).json({ id });
});

// PUT /api/surveys/:id — оновити
router.put('/:id', requireAdmin, (req, res) => {
  const { title, description, questions } = req.body;
  const exists = db.prepare('SELECT id FROM surveys WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Не знайдено' });

  db.prepare(`UPDATE surveys SET title = ?, description = ?, questions = ? WHERE id = ?`)
    .run(title.trim(), (description || '').trim(), JSON.stringify(questions), req.params.id);

  res.json({ ok: true });
});

// DELETE /api/surveys/:id — видалити (каскадно прибирає responses і used_hashes)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});


module.exports = router;
