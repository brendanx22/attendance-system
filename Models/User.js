const db = require('../Config/db');
const bcrypt = require('bcryptjs');

class User {
    static async create(username, password, role) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        return result;
    }

    static async findByUsername(username) {
    const [rows] = await db.execute(
        'SELECT id, username, email, password, first_name, last_name, role FROM users WHERE username = ?',
        [username]
    );
    return rows[0];
}

    static async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    }
}

module.exports = User;