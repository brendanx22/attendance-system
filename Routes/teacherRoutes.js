const express = require('express');
const router = express.Router();
const teacherController = require('../Controllers/teacherController');

const isTeacher = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false,
            error: 'Not authenticated' 
        });
    }
    if (req.session.user.role !== 'teacher') {
        return res.status(403).json({ 
            success: false,
            error: 'Forbidden - Teacher access only' 
        });
    }
    next();
};

router.use(isTeacher);

// Dashboard routes
router.get('/dashboard', teacherController.getDashboard);
router.get('/dashboard/data', teacherController.getDashboardData);

// Class management routes
router.get('/classes', teacherController.getClasses);
router.get('/classes/data', teacherController.getClassesData);
router.get('/classes/new', teacherController.getNewClassPage);
router.post('/classes', teacherController.createClass);
router.get('/classes/:id', teacherController.getClassDetailPage);
router.get('/classes/:id/data', teacherController.getClassDetailData);
router.get('/classes/:id/edit', teacherController.getEditClassPage);
router.put('/classes/:id', teacherController.updateClass);

// Current user endpoint
router.get('/current-user', (req, res) => {
    const user = req.session.user;
    res.json({
        success: true,
        data: {
            name: user.full_name || user.username,
            initials: user.initials || (user.username?.[0] || 'T').toUpperCase(),
            role: user.role
        }
    });
});

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Teacher route error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

module.exports = router;