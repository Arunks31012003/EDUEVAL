// middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('AUTH ERROR: No or malformed token:', authHeader);
    return res.status(401).json({ message: 'Unauthorized. Token not provided or malformed.' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please login again.'
          : 'Invalid token. Please login again.';
      console.log('AUTH ERROR:', message, err);
      return res.status(403).json({ message });
    }

    req.user = decoded;
    next();
  });
};
