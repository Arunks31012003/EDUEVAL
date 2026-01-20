    // backend/routes/adminRoutes.js
    const express = require('express');
    const router = express.Router();
    const courseController = require('../controllers/courseController');
    const superAdminController = require('../controllers/SuperAdminController'); // Import SuperAdminController
    const testController = require('../controllers/testController'); // Import testController for uploadNewReadingTest
    const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
    const uploadReadingTestCsv = require('../middleware/readingUpload'); // NEW: Import the new multer middleware

    // All routes in this file will be prefixed with /api/admin from server.js

    // Apply authentication middleware to all routes defined after this point in this router.
    // This ensures that any request to an /api/admin/* endpoint will first be verified.
    router.use(verifyToken);

    // Course Management Routes (assuming these are for general 'admin' role)
    router.post('/courses', authorizeRoles(['admin']), courseController.addCourse);
    router.patch('/courses/:id/duration', authorizeRoles(['admin']), courseController.setTestDuration);
    router.delete('/courses/:id', authorizeRoles(['admin']), courseController.deleteCourse);

    // Routes for Dashboard Counts and Status Counts (accessible to 'admin' and 'superadmin')
    router.get('/users/count', authorizeRoles(['admin', 'superadmin']), superAdminController.getTotalUsersCount);
    router.get('/admins/count', authorizeRoles(['admin', 'superadmin']), superAdminController.getTotalAdminsCount);

    // Routes for status-based counts
    router.get('/users/status-counts', authorizeRoles(['admin', 'superadmin']), superAdminController.getUsersByStatusCount);
    router.get('/admins/status-counts', authorizeRoles(['admin', 'superadmin']), superAdminController.getAdminsByStatusCount);

    // Get Total Courses Count
    router.get('/courses/total-count', authorizeRoles(['admin', 'superadmin']), superAdminController.getTotalCoursesCount);

    // --- CRITICAL FIX: NEW ENDPOINT FOR COURSE TYPE COUNTS ---
    // This endpoint will be accessible at /api/admin/courses/type-counts
    router.get('/courses/type-counts', authorizeRoles(['admin', 'superadmin']), superAdminController.getCourseTypeCounts); // <--- ADDED/CONFIRMED THIS LINE

    // NEW: Admin route to upload a reading test (passage + questions)
    router.post('/reading-tests/upload', authorizeRoles(['admin']), uploadReadingTestCsv.single('file'), testController.uploadNewReadingTest);

    module.exports = router;
