// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// --- NEW/UPDATED IMPORTS ---
// Import your AuthController which contains the actual logic for auth operations
// This is crucial: it tells this file to use the functions defined in AuthController.js
const authController = require('../controllers/authController');

// Import your existing authenticateToken middleware
// Ensure this path is correct for your authenticateToken.js file
// Note: You previously had 'authMiddleware' and 'verifyToken'.
// Based on your 'authenticateToken.js' file you shared, it exports the middleware directly as 'module.exports = (req, res, next) => { ... }'.
// So, the correct import for that file is:
const authenticateToken = require('../middleware/authenticateToken'); // Assuming this is the file where your token verification logic resides

// ==================== AUTHENTICATION ROUTES (Using AuthController) ====================

// Route for user registration
// This will call the 'registerUser' function from AuthController.js
router.post('/register', authController.registerUser);

// Route for user login
// This will call the 'loginUser' function from AuthController.js
router.post('/login', authController.loginUser);

// Route for fetching user profile (requires authentication)
// This route will first pass through 'authenticateToken' to ensure the user is logged in
// and populate req.user, then call 'getProfile' from AuthController.js
router.get('/profile', authenticateToken, authController.getProfile);

// Routes for Forgot Password / Reset Password flow
// These routes do not initially require a token as they are for recovering access
router.post('/forgot-password', authController.sendResetOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

module.exports = router;