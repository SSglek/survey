const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// Ініціалізуємо БД (створює таблиці, якщо не існують)
require('./db/database');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'survey-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Статика фронтенду
app.use(express.static(path.join(__dirname, 'public')));

// API-маршрути
app.use('/api/auth',      require('./routes/auth'));
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

/*
1. cd D:\survey-prototype-v2\survey-prototype
2. npm start

3. нове CMD
4. ngrok http 3000
*/