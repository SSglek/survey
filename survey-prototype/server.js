const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Ініціалізуємо БД (створює таблиці, якщо не існують)
require('./db/database');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Статика фронтенду
app.use(express.static(path.join(__dirname, 'public')));

// API-маршрути
app.use('/api/surveys',   require('./routes/surveys'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/verify',    require('./routes/verify'));
// webhook для шлюзу
app.use('/api/webhook',   require('./routes/webhook'));

// Усі інші GET → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n Сервер запущено: http://localhost:${PORT}\n`);
});
const session = require('express-session');
require('dotenv').config();

// 1. Підключаємо сесії (додати перед маршрутами API)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 години
}));

// Middleware перевірки прав адміна
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Доступ заборонено. Потрібні права адміністратора.' });
}

// 2. Підключаємо маршрути авторизації
app.use('/api/auth', require('./routes/auth'));

// 3. Захищаємо критичні маршрути (створення/видалення)
// Приклад у routes/surveys.js:
// router.post('/', requireAdmin, ...);
// router.delete('/:id', requireAdmin, ...);

/*
1. cd D:\survey-prototype-v2\survey-prototype
2. npm start

3. нове CMD
4. ngrok http 3000
*/