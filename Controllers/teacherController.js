const db = require('../Config/db');
const path = require('path');
const fs = require('fs');

const viewsPath = path.join(__dirname, '../Public/views');

// Dashboard
teacherController.getDashboard = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'teacher-dashboard.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Dashboard template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Server Error');
    }
};

teacherController.getDashboardData = async (req, res) => {
    try {
        const [classes] = await db.execute(
            'SELECT c.id, c.name, c.code, c.schedule FROM classes c WHERE c.teacher_id = ?',
            [req.session.user.id]
        );

        const [attendance] = await db.execute(
            `SELECT COUNT(CASE WHEN status = 'present' THEN 1 END) as present
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             WHERE c.teacher_id = ? AND a.date = CURDATE()`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            data: {
                user: {
                    ...req.session.user,
                    full_name: `${req.session.user.first_name || ''} ${req.session.user.last_name || ''}`.trim() || 'Teacher',
                    initials: `${req.session.user.first_name?.[0] || 'T'}${req.session.user.last_name?.[0] || ''}`.toUpperCase()
                },
                classes: classes || [],
                attendanceSummary: {
                    present: attendance[0]?.present || 0,
                    absent: 0
                }
            }
        });
    } catch (err) {
        console.error('Dashboard data error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error' 
        });
    }
};

// Classes
teacherController.getClasses = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'classes.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Classes template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading classes:', err);
        res.status(500).send('Failed to load classes');
    }
};

teacherController.getClassesData = async (req, res) => {
    try {
        const [classes] = await db.execute(
            `SELECT 
                c.id, 
                c.name, 
                c.code, 
                c.schedule, 
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
             FROM classes c
             WHERE c.teacher_id = ?`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            data: classes || []
        });
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error' 
        });
    }
};

// Class Detail
teacherController.getClassDetailPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'class-detail.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Class detail template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading class detail:', err);
        res.status(500).send('Failed to load class detail');
    }
};

teacherController.getClassDetailData = async (req, res) => {
    try {
        const classId = req.params.id;
        const teacherId = req.session.user.id;

        // Get basic class info
        const [classInfo] = await db.execute(
            'SELECT id, name, code, schedule FROM classes WHERE id = ? AND teacher_id = ?',
            [classId, teacherId]
        );

        if (!classInfo?.length) {
            return res.status(404).json({
                success: false,
                error: 'Class not found or you do not have permission'
            });
        }

        // Get students
        const [students] = await db.execute(
            `SELECT u.id, u.first_name, u.last_name, u.email 
             FROM users u
             JOIN class_students cs ON u.id = cs.student_id
             WHERE cs.class_id = ?`,
            [classId]
        );

        // Attendance stats
        let attendanceRate = 0;
        let totalSessions = 0;

        if (students?.length > 0) {
            const [stats] = await db.execute(
                `SELECT 
                    COUNT(DISTINCT date) AS total_sessions,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count
                 FROM attendance
                 WHERE class_id = ?`,
                [classId]
            );

            totalSessions = stats[0]?.total_sessions || 0;
            const presentCount = stats[0]?.present_count || 0;

            attendanceRate = totalSessions > 0
                ? Math.round((presentCount / (totalSessions * students.length)) * 100)
                : 0;
        }

        // Next session
        const schedule = classInfo[0].schedule || '';
        let nextSession = 'Not scheduled';
        if (schedule.includes('Mon')) nextSession = 'Next Monday';
        else if (schedule.includes('Tue')) nextSession = 'Next Tuesday';

        return res.json({
            success: true,
            data: {
                class: classInfo[0],
                students: students || [],
                stats: {
                    totalStudents: students.length,
                    attendanceRate,
                    nextSession,
                    lastUpdated: new Date().toISOString()
                }
            }
        });

    } catch (err) {
        console.error('Error in getClassDetailData:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Create and Update Classes
teacherController.createClass = async (req, res) => {
    try {
        const { name, code, schedule } = req.body;
        const teacherId = req.session.user.id;

        const [result] = await db.execute(
            'INSERT INTO classes (name, code, teacher_id, schedule) VALUES (?, ?, ?, ?)',
            [name, code, teacherId, schedule]
        );

        res.json({
            success: true,
            data: {
                classId: result.insertId
            }
        });
    } catch (err) {
        console.error('Error creating class:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create class' 
        });
    }
};

teacherController.updateClass = async (req, res) => {
    try {
        const { name, code, schedule } = req.body;
        const classId = req.params.id;
        const teacherId = req.session.user.id;

        await db.execute(
            'UPDATE classes SET name = ?, code = ?, schedule = ? WHERE id = ? AND teacher_id = ?',
            [name, code, schedule, classId, teacherId]
        );

        res.json({ 
            success: true 
        });
    } catch (err) {
        console.error('Error updating class:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update class' 
        });
    }
};

// Classes
teacherController.getClasses = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'classes.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Classes template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading classes:', err);
        res.status(500).send('Failed to load classes');
    }
};

// Add to teacherController.js
teacherController.getClassesData = async (req, res) => {
    try {
        const [classes] = await db.execute(
            'SELECT c.id, c.name, c.code, c.schedule, COUNT(cs.student_id) as student_count ' +
            'FROM classes c LEFT JOIN class_students cs ON c.id = cs.class_id ' +
            'WHERE c.teacher_id = ? GROUP BY c.id',
            [req.session.user.id]
        );
        res.json(classes || []);
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

teacherController.getClassData = async (req, res) => {
    try {
        const [classInfo] = await db.execute(
            'SELECT * FROM classes WHERE id = ? AND teacher_id = ?',
            [req.params.id, req.session.user.id]
        );

        const [students] = await db.execute(
            `SELECT u.id, u.first_name, u.last_name
             FROM users u
             JOIN class_students cs ON u.id = cs.student_id
             WHERE cs.class_id = ?`,
            [req.params.id]
        );

                res.json({
                    class: classInfo[0],
                    students: students || []
                });
            } catch (err) {
                console.error('Error fetching class data:', err);
                res.status(500).json({ error: 'Database error' });
            }
        };

teacherController.getNewClassPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'new-class.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('New class template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading new class page:', err);
        res.status(500).send('Failed to load new class page');
    }
};

teacherController.getEditClassPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'edit-class.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Edit class template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading edit class page:', err);
        res.status(500).send('Failed to load edit class page');
    }
};

// Attendance
teacherController.getAttendanceSelectionPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'attendance-selection.html');
        if (!fs.existsSync(filePath)) {
            return res.redirect('/teacher/classes');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading attendance selection:', err);
        res.status(500).send('Failed to load attendance selection');
    }
};

teacherController.getAttendancePage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'attendance.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Attendance template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading attendance page:', err);
        res.status(500).send('Failed to load attendance');
    }
};

teacherController.getAttendanceData = async (req, res) => {
    try {
        const { classId, date } = req.params;
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Verify class exists and belongs to teacher
        const [classInfo] = await db.execute(
            'SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?',
            [classId, req.session.user.id]
        );
        
        if (!classInfo.length) {
            return res.status(404).json({ 
                success: false,
                message: 'Class not found or access denied'
            });
        }

        // Get attendance data
        const [students] = await db.execute(
            `SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                COALESCE(a.status, 'present') as status
             FROM users u
             JOIN class_students cs ON u.id = cs.student_id
             LEFT JOIN attendance a ON a.student_id = u.id 
                AND a.class_id = ? 
                AND a.date = ?
             WHERE cs.class_id = ?`,
            [classId, date, classId]
        );

        // Get total enrolled count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM class_students WHERE class_id = ?',
            [classId]
        );

        res.json({
            success: true,
            message: 'Attendance data loaded successfully',
            data: {
                class: classInfo[0],
                totalStudents: countResult[0].total,
                attendanceRecords: students
            }
        });
        
    } catch (err) {
        console.error('Error in getAttendanceData:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to load attendance data',
            error: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
    }
};

teacherController.saveAttendance = async (req, res) => {
    try {
        const { classId, date, attendance } = req.body;
        
        await db.beginTransaction();
        
        await db.execute(
            'DELETE FROM attendance WHERE class_id = ? AND date = ?',
            [classId, date]
        );
        
        for (const studentId in attendance) {
            await db.execute(
                'INSERT INTO attendance (class_id, student_id, date, status, recorded_by) VALUES (?, ?, ?, ?, ?)',
                [classId, studentId, date, attendance[studentId], req.session.user.id]
            );
        }
        
        await db.commit();
        res.json({ success: true });
    } catch (err) {
        await db.rollback();
        console.error('Error saving attendance:', err);
        res.status(500).json({ error: 'Failed to save attendance' });
    }
};

// Students
teacherController.getStudentsPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'students.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Students template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading students page:', err);
        res.status(500).send('Failed to load students page');
    }
};

teacherController.getStudentsData = async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.email,
                GROUP_CONCAT(c.name) AS class_names,
                COUNT(a.id) AS total_attendance,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count
            FROM users u
            LEFT JOIN class_students cs ON u.id = cs.student_id
            LEFT JOIN classes c ON cs.class_id = c.id
            LEFT JOIN attendance a ON u.id = a.student_id
            WHERE u.role = 'student' AND c.teacher_id = ?
            GROUP BY u.id
        `, [req.session.user.id]);

        const formattedStudents = students.map(student => ({
            ...student,
            class_names: student.class_names ? student.class_names.split(',') : [],
            attendance_rate: student.total_attendance > 0 
                ? Math.round((student.present_count / student.total_attendance) * 100)
                : 0
        }));

        res.json(formattedStudents);
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// Reports
teacherController.getReportsPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'reports.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Reports template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading reports page:', err);
        res.status(500).send('Failed to load reports page');
    }
};

teacherController.getReportsData = async (req, res) => {
    try {
        // Class attendance data
        const [classAttendance] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                COUNT(DISTINCT a.student_id) AS total_students,
                AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 AS attendance_rate
            FROM classes c
            LEFT JOIN attendance a ON c.id = a.class_id
            WHERE c.teacher_id = ?
            GROUP BY c.id
        `, [req.session.user.id]);

        // Weekly performance data
        const [weeklyPerformance] = await db.execute(`
            SELECT 
                YEARWEEK(a.date) AS week,
                AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 AS attendance_rate
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE c.teacher_id = ?
            GROUP BY YEARWEEK(a.date)
            ORDER BY week
            LIMIT 4
        `, [req.session.user.id]);

        res.json({
            classAttendance,
            weeklyPerformance
        });
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// Get class detail page
teacherController.getClass = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'class-detail.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Class detail template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading class detail:', err);
        res.status(500).send('Failed to load class detail');
    }
};

// Get class data for detail page
teacherController.getClassDetailData = async (req, res) => {
    try {
        const classId = req.params.id;
        
        // Get basic class info
        const [classInfo] = await db.execute(
            'SELECT * FROM classes WHERE id = ? AND teacher_id = ?',
            [classId, req.session.user.id]
        );
        
        if (!classInfo || classInfo.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Class not found' 
            });
        }

        res.json({
            success: true,
            class: classInfo[0]
        });
    } catch (err) {
        console.error('Error fetching class detail:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error' 
        });
    }
};

// Get class detail page
teacherController.getClassDetailPage = async (req, res) => {
    try {
        const filePath = path.join(viewsPath, 'class-detail.html');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Class detail template not found');
        }
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error loading class detail:', err);
        res.status(500).send('Failed to load class detail');
    }
};

// Get class data for detail page
teacherController.getClassDetailData = async (req, res) => {
    try {
        const classId = req.params.id;

        // ✅ SESSION CHECK
        if (!req.session?.user?.id) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Please log in.',
                data: null
            });
        }

        const teacherId = req.session.user.id;

        // ✅ Get basic class info
        const [classInfo] = await db.execute(
            'SELECT id, name, code, schedule FROM classes WHERE id = ? AND teacher_id = ?',
            [classId, teacherId]
        );

        if (!classInfo?.length) {
            return res.status(404).json({
                success: false,
                error: 'Class not found or you do not have permission',
                data: null
            });
        }

        // ✅ Get students
        const [students] = await db.execute(
            `SELECT u.id, u.first_name, u.last_name, u.email 
             FROM users u
             JOIN class_students cs ON u.id = cs.student_id
             WHERE cs.class_id = ?`,
            [classId]
        );

        // ✅ Attendance stats
        let attendanceRate = 0;
        let totalSessions = 0;

        if (students?.length > 0) {
            const [stats] = await db.execute(
                `SELECT 
                    COUNT(DISTINCT date) AS total_sessions,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count
                 FROM attendance
                 WHERE class_id = ?`,
                [classId]
            );

            totalSessions = stats[0]?.total_sessions || 0;
            const presentCount = stats[0]?.present_count || 0;

            attendanceRate = totalSessions > 0
                ? Math.round((presentCount / (totalSessions * students.length)) * 100)
                : 0;
        }

        // ✅ Next session (basic example)
        const schedule = classInfo[0].schedule || '';
        let nextSession = 'Not scheduled';
        if (schedule.includes('Mon')) nextSession = 'Next Monday';
        else if (schedule.includes('Tue')) nextSession = 'Next Tuesday';

        // ✅ Final response
        return res.json({
            success: true,
            data: {
                class: classInfo[0],
                students: students || [],
                stats: {
                    totalStudents: students.length,
                    attendanceRate,
                    nextSession,
                    lastUpdated: new Date().toISOString()
                }
            }
        });

    } catch (err) {
        console.error('Error in getClassDetailData:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
            data: null
        });
    }
};


teacherController.createClass = async (req, res) => {
    try {
        const { name, code, schedule } = req.body;
        const teacherId = req.session.user.id;

        const [result] = await db.execute(
            'INSERT INTO classes (name, code, teacher_id, schedule) VALUES (?, ?, ?, ?)',
            [name, code, teacherId, schedule]
        );

        res.json({
            success: true,
            classId: result.insertId
        });
    } catch (err) {
        console.error('Error creating class:', err);
        res.status(500).json({ error: 'Failed to create class' });
    }
};

teacherController.updateClass = async (req, res) => {
    try {
        const { name, code, schedule } = req.body;
        const classId = req.params.id;
        const teacherId = req.session.user.id;

        await db.execute(
            'UPDATE classes SET name = ?, code = ?, schedule = ? WHERE id = ? AND teacher_id = ?',
            [name, code, schedule, classId, teacherId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating class:', err);
        res.status(500).json({ error: 'Failed to update class' });
    }
};

teacherController.getDashboardData = async (req, res) => {
    try {
        const [classes] = await db.execute(
            'SELECT c.id, c.name, c.code, c.schedule FROM classes c WHERE c.teacher_id = ?',
            [req.session.user.id]
        );

        const [attendance] = await db.execute(
            `SELECT COUNT(CASE WHEN status = 'present' THEN 1 END) as present
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             WHERE c.teacher_id = ? AND a.date = CURDATE()`,
            [req.session.user.id]
        );
 res.json({
            user: req.session.user, // Include user in response
            classes: classes || [],
            attendanceSummary: {
                present: attendance[0]?.present || 0,
                absent: 0
            }
        });
    } catch (err) {
        console.error('Dashboard data error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

teacherController.getClassesData = async (req, res) => {
    try {
        const [classes] = await db.execute(
            `SELECT 
                c.id, 
                c.name, 
                c.code, 
                c.schedule, 
                (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS student_count
             FROM classes c
             WHERE c.teacher_id = ?`,
            [req.session.user.id]
        );

        res.json(classes || []);
    } catch (err) {
        console.error('Error loading class data:', err);
        res.status(500).json({ error: 'Failed to load classes' });
    }
};

module.exports = teacherController;