const db = require('./Config/db');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        // Create database
        await db.execute('CREATE DATABASE IF NOT EXISTS attendance_system');
        await db.execute('USE attendance_system');

        // Create users table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('teacher', 'student') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Create sample teacher user
        const hashedPassword = await bcrypt.hash('password123', 10);
        await db.execute(
            'INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
            ['teacher1', hashedPassword, 'teacher']
        );

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        process.exit();
    }
}

setupDatabase();