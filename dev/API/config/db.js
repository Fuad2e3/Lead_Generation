const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lead_generation_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('DB Pool initialized...');

module.exports = db;