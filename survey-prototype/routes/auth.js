const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const users = [
  {
    id: 'admin-1',
    username: ADMIN_USERNAME,
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'admin'
  }
];

function getUserByUsername(username) {
  const normalized = String(username || '').trim().toLowerCase();
  return users.find(user => user.username.toLowerCase() === normalized);
}

router.get('/status', (req, res) => {
  const user = req.session?.user || null;

  res.json({
    ok: true,
    isAdmin: !!(user && user.role === 'admin'),
    isAuthenticated: !!user,
    user: user ? { username: user.username, role: user.role } : null
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Потрібні логін і пароль.' });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Невірний логін або пароль.' });
  }

  const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ ok: false, message: 'Невірний логін або пароль.' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  return res.json({
    ok: true,
    user: { username: user.username, role: user.role },
    message: 'Вхід виконано.'
  });
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Введіть логін і пароль.' });
  }

  const trimmedUsername = String(username).trim();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ ok: false, message: 'Логін має містити мінімум 3 символи.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ ok: false, message: 'Пароль має містити мінімум 6 символів.' });
  }

  if (getUserByUsername(trimmedUsername)) {
    return res.status(409).json({ ok: false, message: 'Користувач з таким логіном вже існує.' });
  }

  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: trimmedUsername,
    passwordHash: bcrypt.hashSync(String(password), 10),
    role: 'user'
  };

  users.push(newUser);

  req.session.user = {
    id: newUser.id,
    username: newUser.username,
    role: newUser.role
  };

  return res.status(201).json({
    ok: true,
    user: { username: newUser.username, role: newUser.role },
    message: 'Реєстрація успішна.'
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Вихід виконано.' });
  });
});

module.exports = router;