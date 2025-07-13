const User = require('../Models/User');

exports.getLogin = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.sendFile('index.html', { root: 'Public/views' });
    });
};

exports.postLogin = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Development demo bypass
        req.session.user = {
            id: 1,
            username,
            role: role || 'teacher',
            first_name: username.split('@')[0] || username,
            last_name: '',
            full_name: username.split('@')[0] || username,
            initials: (username.split('@')[0]?.[0] || 'T').toUpperCase()
        };
        
        return res.json({ 
            success: true, 
            data: {
                redirect: role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error during authentication' 
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Could not log out' 
            });
        }
        res.clearCookie('connect.sid');
        res.json({ 
            success: true, 
            data: { redirect: '/' } 
        });
    });
};