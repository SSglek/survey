const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');   // вбудована бібліотека Node.js, нічого встановлювати
const db      = require('../db/database');

const ALLOWED_DOMAIN = 'rshu.edu.ua';

// POST /api/verify
// Body: { email, surveyId }
// Відповідь: { ok: true, hash } або { ok: false, error }
//
// ⚠️  Email на сервері НЕ зберігається — використовується лише для обчислення хешу
router.post('/', (req, res) => {
  const { email, surveyId } = req.body;

  if (!email || !surveyId)
    return res.status(400).json({ ok: false, error: 'Відсутні обов\'язкові поля' });

  const normalized = email.trim().toLowerCase();

  // 1. Перевірка домену
  if (!normalized.endsWith('@' + ALLOWED_DOMAIN))
    return res.json({ ok: false, error: `Допускається лише пошта @${ALLOWED_DOMAIN}` });

  // 2. SHA-256 через вбудований crypto Node.js — email далі не використовується
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');

  // 3. Перевірка в таблиці used_hashes
  const used = db.prepare(
    'SELECT 1 FROM used_hashes WHERE hash = ? AND survey_id = ?'
  ).get(hash, surveyId);

  if (used)
    return res.json({ ok: false, error: 'Ви вже проходили це опитування з цієї пошти.' });

  // Email відкидається — повертаємо лише хеш
  res.json({ ok: true, hash });
});

module.exports = router;
