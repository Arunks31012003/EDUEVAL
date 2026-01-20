// backend/middleware/superAdminAuth.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Ensure this matches AuthController

exports.superadminRequired = (req, res, next) => {
    // This middleware assumes that authenticateToken has already run and attached user info to req.user
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access denied' });
    }
    next();
};

// You might also need to explicitly export authenticateToken or ensure it's applied before this middleware
// If authenticateToken.js doesn't attach req.user, you'll need to modify it or do it here.
// For now, let's assume authenticateToken attaches req.user = { id, email, role }