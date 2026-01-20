// routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const {
    getCourses,
    getCourseById,
} = require('../controllers/courseController'); // Removed addCourse, setTestDuration, getTestDuration, deleteCourse

const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// IMPORTANT: These routes are for general course operations, NOT admin-specific ones.
// Admin-specific routes (add, update duration, delete) will be in adminRoutes.js
// This file (courseRoutes.js) should primarily handle fetching courses for users.

// GET /api/courses: Get all courses (for users to see available tests)
// ✅ FIXED: Added 'user' role to authorizeRoles to allow users to fetch courses
router.get('/', verifyToken, authorizeRoles(['admin', 'student', 'user']), getCourses);

// GET /api/courses/:id: Get a specific course by ID (if needed for general user view)
router.get('/:id', verifyToken, getCourseById);

// NOTE: The addCourse, setTestDuration, and deleteCourse
// routes are now handled by routes/adminRoutes.js,
// which correctly uses the /api/admin prefix.
// So, we are REMOVING them from here to avoid conflicts and keep separation of concerns.

module.exports = router;
