const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin, requireAuth } = require('../middleware/auth');

function genId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

router.get('/', requireAdmin, (req, res) => {
  const requests = db.prepare(`
    SELECT id, survey_id, user_email, message, status, created_at
    FROM access_requests
    ORDER BY created_at DESC
  `).all();

  res.json(requests);
});

router.patch('/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Невірний статус.' });
  }

  const updated = db.prepare(`
    UPDATE access_requests
    SET status = ?
    WHERE id = ?
  `).run(status, id);

  if (!updated.changes) {
    return res.status(404).json({ ok: false, message: 'Запит не знайдено.' });
  }

  return res.json({ ok: true, message: 'Статус оновлено.' });
});

router.get('/check/:surveyId', requireAuth, (req, res) => {
  const currentUser = req.session?.user;
  const userIdentifiers = [];

  if (currentUser?.username) {
    userIdentifiers.push(String(currentUser.username).trim().toLowerCase());
  }

  if (!userIdentifiers.length) {
    return res.json({ ok: true, approved: false });
  }

  const query = `
    SELECT 1
    FROM access_requests
    WHERE survey_id = ?
      AND status = 'approved'
      AND user_email IN (${userIdentifiers.map(() => '?').join(',')})
    LIMIT 1
  `;

  const row = db.prepare(query).get(req.params.surveyId, ...userIdentifiers);

  return res.json({ ok: true, approved: !!row });
});

router.post('/', requireAuth, (req, res) => {
  const { surveyId, email, message } = req.body || {};
  const currentUser = req.session?.user;
  const fallbackEmail = currentUser?.username ? String(currentUser.username).trim().toLowerCase() : '';

  if (!surveyId) {
    return res.status(400).json({ ok: false, message: 'Не передано ID опитування.' });
  }

  const normalizedEmail = String(email || fallbackEmail || '').trim().toLowerCase();
  const trimmedMessage = String(message || '').trim();

  if (!trimmedMessage) {
    return res.status(400).json({ ok: false, message: 'Введіть текст запиту для адміністратора.' });
  }

  const requestId = genId();

  db.prepare(`
    INSERT INTO access_requests (id, survey_id, user_email, message, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(requestId, surveyId, normalizedEmail || 'not-provided', trimmedMessage);

  return res.status(201).json({
    ok: true,
    message: 'Очікуйте на рішення адміністратора'
  });
});

module.exports = router;
