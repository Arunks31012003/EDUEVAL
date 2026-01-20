// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('Middleware: authHeader:', authHeader); // <<< ADD THIS LOG
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Middleware: Extracted Token:', token); // <<< ADD THIS LOG

    if (!token) {
        console.log('Middleware: Token missing or malformed'); // <<< ADD THIS LOG
        return res.status(401).json({ error: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) {
            console.log('Middleware: JWT Verification Error:', err.message); // <<< ADD THIS LOG
            const message =
                err.name === 'TokenExpiredError'
                    ? 'Session expired. Please login again.'
                    : 'Invalid token. Please login again.';
            return res.status(403).json({ error: message });
        }
        req.user = user;
        console.log('Middleware: Token Verified. User:', req.user); // <<< ADD THIS LOG
        next();
    });
};

const authorizeRoles = (roles) => {
    return (req, res, next) => {
        console.log('Middleware: authorizeRoles called. User role:', req.user ? req.user.role : 'N/A'); // <<< ADD THIS LOG
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied. No role information found.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires one of: ${roles.join(', ')} roles.` });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };
