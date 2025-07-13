const express = require('express');
const router = express.Router();
const path = require('path');
const studentsController = require('../Controllers/studentsController');

// Dashboard
router.get('/dashboard', studentsController.getDashboard);
router.get('/dashboard/data', studentsController.getDashboardData);

// Attendance
router.get('/attendance', studentsController.getAttendancePage);
router.get('/attendance/data', studentsController.getAttendanceData);
router.get('/attendance/export', studentsController.exportAttendance);

// Schedule
router.get('/schedule', studentsController.getSchedulePage);
router.get('/schedule/data', studentsController.getScheduleData);
router.get('/schedule/upcoming', studentsController.getUpcomingClasses);

// Profile
router.get('/profile', studentsController.getProfilePage);
router.get('/profile/data', studentsController.getProfileData);
router.post('/profile/update', studentsController.updateProfile);

module.exports = router;