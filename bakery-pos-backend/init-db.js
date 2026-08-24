require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'cashier'
      )
    `);

    // Создаём админа, если его ещё нет
    const hash = bcrypt.hashSync('admin123', 8);
    await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['admin', hash, 'admin']
    );

    console.log('База готова. Логин: admin, пароль: admin123');
  } catch (e) {
    console.error('Ошибка при инициализации БД:', e);
  } finally {
    client.release();
  }
})();
