const db = require('../Config/db');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const viewsPath = path.join(__dirname, '../Public/views');

// Dashboard
exports.getDashboard = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/');
    }
    
    try {
        const filePath = path.join(viewsPath, 'student-dashboard.html');
        if (!fs.existsSync(filePath)) {
            console.error('File not found at:', filePath);
            return res.status(404).send('Student dashboard not found');
        }
        res.sendFile(filePath);
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).send('Server Error');
    }
};

exports.getDashboardData = async (req, res) => {
    if (!req.session.user?.id || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // 1. Get attendance records
        const [attendance] = await db.execute(`
            SELECT a.date, a.status, c.name AS class_name 
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
            LIMIT 10
        `, [req.session.user.id]);

        // 2. Get statistics
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) AS total_classes,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count
            FROM attendance
            WHERE student_id = ?
        `, [req.session.user.id]);

        // 3. Get next class (with error handling)
        let nextClass = { name: 'No upcoming classes' };
        try {
            const [nextClassResult] = await db.execute(`
                SELECT c.name 
                FROM class_schedule cs
                JOIN classes c ON cs.class_id = c.id
                JOIN class_students cls ON c.id = cls.class_id
                WHERE cls.student_id = ? AND cs.start_time > NOW()
                ORDER BY cs.start_time ASC
                LIMIT 1
            `, [req.session.user.id]);
            if (nextClassResult.length) nextClass = nextClassResult[0];
        } catch (err) {
            console.log('Class schedule query error:', err.message);
        }

        res.json({
            success: true,
            data: {
                attendance: attendance || [],
                stats: {
                    totalClasses: stats[0]?.total_classes || 0,
                    attendanceRate: stats[0]?.total_classes > 0 
                        ? Math.round((stats[0].present_count / stats[0].total_classes) * 100)
                        : 0,
                    nextClass: nextClass.name
                },
                user: req.session.user
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Database error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// Attendance
exports.getAttendancePage = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/');
    }
    
    try {
        const filePath = path.join(viewsPath, 'student-attendance.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Attendance page not found');
        }
        res.sendFile(filePath);
    } catch (error) {
        console.error('Attendance page error:', error);
        res.status(500).send('Server Error');
    }
};

exports.getAttendanceData = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        let query = `
            SELECT a.date, a.status, c.name AS class_name, 
                   CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN users u ON c.teacher_id = u.id
            WHERE a.student_id = ?
        `;
        
        const params = [req.session.user.id];
        
        // Add date filter if provided
        if (req.query.month) {
            query += ` AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
            params.push(req.query.month);
        }
        
        query += ` ORDER BY a.date DESC`;
        
        const [attendance] = await db.execute(query, params);
        
        res.json({ attendance });
    } catch (error) {
        console.error('Error fetching attendance data:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.exportAttendance = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const [attendance] = await db.execute(`
            SELECT a.date, a.status, c.name AS class_name
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [req.session.user.id]);

        // Convert to CSV
        const csv = [
            ['Date', 'Status', 'Class Name'], // Header row
            ...attendance.map(r => [r.date, r.status, r.class_name])
        ].map(row => row.join(',')).join('\n');
        
        res.header('Content-Type', 'text/csv');
        res.attachment('attendance-records.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
};

// Schedule
exports.getSchedulePage = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/');
    }
    
    try {
        const filePath = path.join(viewsPath, 'student-schedule.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Schedule page not found');
        }
        res.sendFile(filePath);
    } catch (error) {
        console.error('Schedule page error:', error);
        res.status(500).send('Server Error');
    }
};

exports.getScheduleData = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        // Modified query without color column
        const [schedule] = await db.execute(`
            SELECT 
                cs.id,
                c.name AS title,
                cs.start_time AS start,
                cs.end_time AS end,
                CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
            FROM class_schedule cs
            JOIN classes c ON cs.class_id = c.id
            JOIN class_students cls ON c.id = cls.class_id
            JOIN users u ON c.teacher_id = u.id
            WHERE cls.student_id = ?
            AND cs.start_time > NOW() - INTERVAL 1 MONTH
            ORDER BY cs.start_time ASC
        `, [req.session.user.id]);

        // Format for FullCalendar with default color
        const events = schedule.map(item => ({
            id: item.id,
            title: item.title,
            start: item.start,
            end: item.end,
            color: '#4f46e5', // Default color
            extendedProps: {
                teacher: item.teacher_name
            }
        }));

        res.json(events);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};
exports.getUpcomingClasses = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const [classes] = await db.execute(`
            SELECT 
                c.name AS class_name,
                cs.start_time AS date,
                DATE_FORMAT(cs.start_time, '%h:%i %p') AS time,
                CONCAT(u.first_name, ' ', u.last_name) AS teacher_name
            FROM class_schedule cs
            JOIN classes c ON cs.class_id = c.id
            JOIN class_students cls ON c.id = cls.class_id
            JOIN users u ON c.teacher_id = u.id
            WHERE cls.student_id = ?
            AND cs.start_time > NOW()
            ORDER BY cs.start_time ASC
            LIMIT 5
        `, [req.session.user.id]);

        res.json(classes);
    } catch (error) {
        console.error('Error fetching upcoming classes:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Profile
exports.getProfilePage = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/');
    }
    
    try {
        const filePath = path.join(viewsPath, 'student-profile.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Profile page not found');
        }
        res.sendFile(filePath);
    } catch (error) {
        console.error('Profile page error:', error);
        res.status(500).send('Server Error');
    }
};

exports.getProfileData = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const [user] = await db.execute(`
            SELECT first_name, last_name, email, username
            FROM users
            WHERE id = ?
        `, [req.session.user.id]);

        if (!user.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.updateProfile = async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const { first_name, last_name, email } = req.body;
        
        await db.execute(`
            UPDATE users 
            SET first_name = ?, last_name = ?, email = ?
            WHERE id = ?
        `, [first_name, last_name, email, req.session.user.id]);

        // Update session
        req.session.user.first_name = first_name;
        req.session.user.last_name = last_name;
        req.session.user.name = `${first_name} ${last_name}`;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Utility function for status badges
function getStatusClass(status) {
    return status === 'present' ? 'bg-success' :
           status === 'absent' ? 'bg-danger' :
           status === 'late' ? 'bg-warning' : 'bg-secondary';
}