// backend/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/SuperAdminController');
const authenticateToken = require('../middleware/authenticateToken'); // Your existing token middleware
const { superadminRequired } = require('../middleware/superAdminAuth'); // The new superadmin role check middleware

// Apply authentication and superadmin checks to all routes in this router
router.use(authenticateToken); // Ensure user is authenticated and req.user is populated
router.use(superadminRequired); // Ensure the authenticated user is a superadmin

// User Management Routes
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserById);
router.post('/users', superAdminController.addUser);
router.put('/users/:id', superAdminController.updateUser);
router.delete('/users/:id', superAdminController.deleteUser); // Soft delete

// Admin Management Routes
router.get('/admins', superAdminController.getAllAdmins);
router.get('/admins/:id', superAdminController.getAdminById);
router.post('/admins', superAdminController.addAdmin);
router.put('/admins/:id', superAdminController.updateAdmin);
router.delete('/admins/:id', superAdminController.deleteAdmin); // Soft delete

// Super Admin Management Routes
router.get('/superadmins', superAdminController.getAllSuperAdmins);
router.get('/superadmins/:id', superAdminController.getSuperAdminById);
router.post('/superadmins', superAdminController.addSuperAdmin);
router.put('/superadmins/:id', superAdminController.updateSuperAdmin);
router.delete('/superadmins/:id', superAdminController.deleteSuperAdmin);

module.exports = router;
