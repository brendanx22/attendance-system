const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'teacher' 
      ? '/teacher/dashboard' 
      : '/student/dashboard');
  }
  res.sendFile(path.join(__dirname, '../Public/views/index.html'));
});

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', authController.logout);


// Login page route
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../Public/views/index.html'));
});

// Login submission route
router.post('/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // Development demo bypass - allow any credentials
        if (process.env.NODE_ENV !== 'production') {
            req.session.user = {
                id: 1,
                username: username,
                role: role || 'teacher', // Default to teacher if not specified
                name: username.split('@')[0] || username
            };
            return res.json({ 
                success: true,
                redirect: role === 'teacher' 
                    ? '/teacher/dashboard' 
                    : '/student/dashboard'
            });
        }

        // Production authentication
        const [users] = await db.execute(
            'SELECT id, password, role FROM users WHERE username = ?',
            [username]
        );

        if (!users.length) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        const user = users[0];
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        if (user.role !== role) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied for selected role' 
            });
        }

        req.session.user = {
            id: user.id,
            username: username,
            role: user.role
        };

        res.json({ 
            success: true,
            redirect: role === 'teacher' 
                ? '/teacher/dashboard' 
                : '/student/dashboard'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed' 
        });
    }
});

module.exports = router;