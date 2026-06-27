const mysql = require('mysql2/promise');
const { db: dbConfig } = require('./config');

let pool;

async function initDb() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await pool.query('SELECT 1');
  return pool;
}

function getDb() {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDb() first.');
  }
  return pool;
}

module.exports = {
  initDb,
  getDb,
};
