const db = require('./Config/db');

async function testConnection() {
  try {
    const [rows] = await db.execute('SELECT * FROM users');
    console.log('Database connection successful! Found users:', rows);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

testConnection();