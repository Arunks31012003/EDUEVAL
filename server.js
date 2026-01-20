// server.js - This is your main Express application file

const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const multer = require('multer'); // Still needed for general purpose uploads if any, or specific routes
const fs = require('fs'); // Import fs for file system operations

// ✅ Route imports
const authRoutes = require('./routes/auth'); // Assuming your auth routes are in ./routes/auth.js
const testRoutes = require('./routes/testRoutes'); // All test-related routes are here
const adminRoutes = require('./routes/adminRoutes'); // IMPORTANT: Make sure this path is correct
const superAdminRoutes = require('./routes/superAdminRoutes'); // SuperAdmin routes
const feedbackRoutes = require('./routes/feedbackRoutes'); // Feedback routes
const courseRoutes = require('./routes/courseRoutes'); // General course routes
const uploadRoutes = require('./routes/uploadRoutes'); // ✅ NEW: Import your uploadRoutes


// ✅ Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser for JSON payloads
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded payloads

// ✅ Serve static files from local uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
// ✅ Serve static images from Uploads/Images
app.use('/images', express.static(path.join(__dirname, 'Uploads', 'Images')));
// ✅ Serve Google Drive files via proxy
app.use('/api/files', require('./middleware/fileProxy'));

// ✅ Register routes
app.use('/api/courses', courseRoutes); // General course routes 
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes); // All test-related routes are mounted here
app.use('/api/admin', adminRoutes); // Mounts admin routes under /api/admin
app.use('/api/superadmin', superAdminRoutes); // Mounts superadmin routes under /api/superadmin
app.use('/api', feedbackRoutes); // Mounts feedback routes under /api
app.use('/api/contact', require('./routes/contactRoutes')); // Contact form route
app.use('/api/uploads', uploadRoutes); // ✅ NEW: Mount your uploadRoutes under /api/uploads
// External proxy for allowed public hosts - used as a secure fallback for legacy public URLs
app.use('/api/external', require('./routes/proxyRoutes'));


// Test route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// --- Error Handling Middleware (optional, but good practice) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
