'use strict';
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------
// 1. Статика: фронтенд из соседней папки
// ---------------------------------------------------------
const frontendPath = process.env.FRONTEND_PATH || '/var/www/bakery-pos';
app.use(express.static(frontendPath));

// Парсинг JSON и urlencoded — обязательно ДО роутов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------
// 2. CORS
// ---------------------------------------------------------
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://192.168.0.235', // замени на IP виртуалки
  credentials: true,
}));

// ---------------------------------------------------------
// 3. Подключение к БД (через раздельные переменные из .env)
// ---------------------------------------------------------
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
});

// ---------------------------------------------------------
// 4. Сессии (в PostgreSQL)
// ---------------------------------------------------------
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'super-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 3600000,
  },
}));

// ---------------------------------------------------------
// 5. Роуты: авторизация
// ---------------------------------------------------------

app.post('/api/login',
  body('username').trim().notEmpty().withMessage('Логин обязателен'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, username, role, password_hash FROM users WHERE username = $1',
      [username]
    );

    console.log('Users found:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    console.log('Password check started');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password matched:', isMatch);

    if (!isMatch) {
      console.log('Wrong password');
      return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.loggedIn = true;

    res.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

app.get('/api/profile', (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.status(401).json({ success: false, message: 'Пользователь не авторизован' });
  }
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
    },
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Ошибка выхода' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Вы вышли' });
  });
});

// ---------------------------------------------------------
// 6. Пример API для кассы (автоподгрузка товаров)
// ---------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    // Здесь будет реальный SELECT из таблицы products
    const result = await pool.query('SELECT * FROM products LIMIT 20');
    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('Products error:', err);
    // Для теста отдаём заглушку, если таблица ещё не создана
    res.json({
      success: true,
      products: [
        { id: 1, name: 'Батон нарезной', price: 45, category: 'хлеб' },
        { id: 2, name: 'Пирожное Наполеон', price: 95, category: 'пирожные' },
        { id: 3, name: 'Печенье овсяное', price: 60, category: 'печенье' },
      ],
    });
  }
});
app.get('/debug/static-test', (req, res) => {
  res.send('Static config is active');
});


// ---------------------------------------------------------
// Запуск сервера
// ---------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Frontend served from: ${frontendPath}`);
});
