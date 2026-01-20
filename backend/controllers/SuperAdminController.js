// backend/controllers/SuperAdminController.js
const pool = require('../db'); // Assuming '../db' correctly exports your PostgreSQL pool
const bcrypt = require('bcrypt');

// --- Utility function to get user for response (optional, to avoid sending password_hash) ---
const getUserForResponse = (user) => {
    const { password, ...rest } = user;
    return rest;
};

// ==================== MANAGE USERS ====================

// GET all users (role 'user')
exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE role = 'user'");
        res.status(200).json(result.rows.map(getUserForResponse));
    } catch (err) {
        console.error("❌ Error fetching users:", err.message);
        res.status(500).send('Server error');
    }
};

// GET user by ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE id = $1 AND role = 'user'",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(getUserForResponse(result.rows[0]));
    } catch (err) {
        console.error("❌ Error fetching user by ID:", err.message);
        res.status(500).send('Server error');
    }
};

// ADD new user
exports.addUser = async (req, res) => {
    const { username, email, phone, password, status } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'User with this username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (username, email, phone, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, phone, role, status, created_at, updated_at',
            [username, email, phone || null, hashedPassword, 'user', status || 'active']
        );

        res.status(201).json({ message: 'User added successfully', user: getUserForResponse(newUser.rows[0]) });
    } catch (err) {
        console.error("❌ Error adding user:", err.message);
        res.status(500).send('Server error');
    }
};

// UPDATE user details
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, phone, password, role, status } = req.body;

    let updateFields = [];
    let queryValues = [];
    let paramIndex = 1;

    if (username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        queryValues.push(username);
    }
    if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        queryValues.push(email);
    }
    if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        queryValues.push(phone);
    }
    if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${paramIndex++}`);
        queryValues.push(hashedPassword);
    }
    if (role !== undefined) {
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Cannot set role to superadmin' });
        }
        updateFields.push(`role = $${paramIndex++}`);
        queryValues.push(role);
    }
    if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        queryValues.push(status);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    queryValues.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} AND role = 'user' RETURNING id, username, email, phone, role, status, created_at, updated_at`;

    try {
        const result = await pool.query(query, queryValues);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found or not a standard user role' });
        }
        res.status(200).json({ message: 'User updated successfully', user: getUserForResponse(result.rows[0]) });
    } catch (err) {
        console.error("❌ Error updating user:", err.message);
        res.status(500).send('Server error');
    }
};

// DELETE (deactivate) user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND role = 'user' RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found or not a standard user role' });
        }
        res.status(200).json({ message: 'User deactivated successfully' });
    } catch (err) {
        console.error("❌ Error deleting user:", err.message);
        res.status(500).send('Server error');
    }
};

// ==================== MANAGE ADMINS ====================

// GET all admins (role 'admin')
exports.getAllAdmins = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE role = 'admin'");
        res.status(200).json(result.rows.map(getUserForResponse));
    } catch (err) {
        console.error("❌ Error fetching admins:", err.message);
        res.status(500).send('Server error');
    }
};

// GET admin by ID
exports.getAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE id = $1 AND role = 'admin'",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json(getUserForResponse(result.rows[0]));
    } catch (err) {
        console.error("❌ Error fetching admin by ID:", err.message);
        res.status(500).send('Server error');
    }
};

// ADD new admin
exports.addAdmin = async (req, res) => {
    const { username, email, phone, password, status } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        const adminExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (adminExists.rows.length > 0) {
            return res.status(409).json({ message: 'User with this username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await pool.query(
            'INSERT INTO users (username, email, phone, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, phone, role, status, created_at, updated_at',
            [username, email, phone || null, hashedPassword, 'admin', status || 'active']
        );

        res.status(201).json({ message: 'Admin added successfully', admin: getUserForResponse(newAdmin.rows[0]) });
    } catch (err) {
        console.error("❌ Error adding admin:", err.message);
        res.status(500).send('Server error');
    }
};

// ADD new super admin
exports.addSuperAdmin = async (req, res) => {
    const { username, email, phone, password, status } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        const superAdminExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (superAdminExists.rows.length > 0) {
            return res.status(409).json({ message: 'User with this username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newSuperAdmin = await pool.query(
            'INSERT INTO users (username, email, phone, password, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, phone, role, status, created_at, updated_at',
            [username, email, phone || null, hashedPassword, 'superadmin', status || 'active']
        );

        res.status(201).json({ message: 'Super Admin added successfully', superadmin: getUserForResponse(newSuperAdmin.rows[0]) });
    } catch (err) {
        console.error("❌ Error adding super admin:", err.message);
        res.status(500).send('Server error');
    }
};

// UPDATE admin details
exports.updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { username, email, phone, password, role, status } = req.body;

    if (req.user.id == id && role && role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin cannot demote self via this endpoint.' });
    }
    const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetUserResult.rows.length > 0 && targetUserResult.rows[0].role === 'superadmin' && req.user.id != id) {
        return res.status(403).json({ message: 'Cannot modify other Superadmin accounts via this endpoint.' });
    }

    let updateFields = [];
    let queryValues = [];
    let paramIndex = 1;

    if (username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        queryValues.push(username);
    }
    if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        queryValues.push(email);
    }
    if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        queryValues.push(phone);
    }
    if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${paramIndex++}`);
        queryValues.push(hashedPassword);
    }
    if (role !== undefined) {
        if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ message: 'Invalid role for admin update. Must be "user" or "admin".' });
        }
        updateFields.push(`role = $${paramIndex++}`);
        queryValues.push(role);
    }
    if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        queryValues.push(status);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    queryValues.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} AND (role = 'admin' OR role = 'superadmin' AND id = $${paramIndex}) RETURNING id, username, email, phone, role, status, created_at, updated_at`;

    try {
        const result = await pool.query(query, queryValues);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found or not an admin role' });
        }
        res.status(200).json({ message: 'Admin updated successfully', admin: getUserForResponse(result.rows[0]) });
    } catch (err) {
        console.error("❌ Error updating admin:", err.message);
        res.status(500).send('Server error');
    }
};

// DELETE (deactivate) admin
exports.deleteAdmin = async (req, res) => {
    const { id } = req.params;

    if (req.user.id == id) {
        return res.status(403).json({ message: 'Superadmin cannot delete their own account.' });
    }
    const targetUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetUserResult.rows.length > 0 && targetUserResult.rows[0].role === 'superadmin') {
        return res.status(403).json({ message: 'Cannot delete other Superadmin accounts.' });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND role = 'admin' RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Admin not found or not an admin role' });
        }
        res.status(200).json({ message: 'Admin deactivated successfully' });
    } catch (err) {
        console.error("❌ Error deleting admin:", err.message);
        res.status(500).send('Server error');
    }
};

// ==================== MANAGE SUPER ADMINS ====================

// GET all super admins (role 'superadmin')
exports.getAllSuperAdmins = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE role = 'superadmin'");
        res.status(200).json(result.rows.map(getUserForResponse));
    } catch (err) {
        console.error("❌ Error fetching super admins:", err.message);
        res.status(500).send('Server error');
    }
};

// GET super admin by ID
exports.getSuperAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT id, username, email, phone, role, status, created_at, updated_at FROM users WHERE id = $1 AND role = 'superadmin'",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Super Admin not found' });
        }
        res.status(200).json(getUserForResponse(result.rows[0]));
    } catch (err) {
        console.error("❌ Error fetching super admin by ID:", err.message);
        res.status(500).send('Server error');
    }
};

// UPDATE super admin details
exports.updateSuperAdmin = async (req, res) => {
    const { id } = req.params;
    const { username, email, phone, password, status } = req.body;

    if (req.user.id == id && status && status !== 'active') {
        return res.status(403).json({ message: 'Superadmin cannot deactivate their own account.' });
    }

    // Check uniqueness for username and email if being updated
    if (username !== undefined) {
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND id != $2',
            [username, id]
        );
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }
    }
    if (email !== undefined) {
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND id != $2',
            [email, id]
        );
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }
    }

    let updateFields = [];
    let queryValues = [];
    let paramIndex = 1;

    if (username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        queryValues.push(username);
    }
    if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        queryValues.push(email);
    }
    if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        queryValues.push(phone);
    }
    if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${paramIndex++}`);
        queryValues.push(hashedPassword);
    }
    if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        queryValues.push(status);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    queryValues.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} AND role = 'superadmin' RETURNING id, username, email, phone, role, status, created_at, updated_at`;

    try {
        const result = await pool.query(query, queryValues);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Super Admin not found or not a super admin role' });
        }
        res.status(200).json({ message: 'Super Admin updated successfully', superadmin: getUserForResponse(result.rows[0]) });
    } catch (err) {
        console.error("❌ Error updating super admin:", err.message);
        res.status(500).send('Server error');
    }
};

// DELETE (deactivate) super admin
exports.deleteSuperAdmin = async (req, res) => {
    const { id } = req.params;

    if (req.user.id == id) {
        return res.status(403).json({ message: 'Superadmin cannot delete their own account.' });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND role = 'superadmin' RETURNING id",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Super Admin not found or not a super admin role' });
        }
        res.status(200).json({ message: 'Super Admin deactivated successfully' });
    } catch (err) {
        console.error("❌ Error deleting super admin:", err.message);
        res.status(500).send('Server error');
    }
};

// ==================== NEW: Dashboard Count Functions ====================
// These are the functions that were missing and causing the [object Undefined] error

exports.getTotalUsersCount = async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'user'");
        const count = parseInt(result.rows[0].count);
        res.status(200).json({ count });
    } catch (error) {
        console.error('❌ Error getting total users count:', error.message);
        res.status(500).json({ message: 'Error fetching user count.' });
    }
};

exports.getTotalAdminsCount = async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        const count = parseInt(result.rows[0].count);
        res.status(200).json({ count });
    } catch (error) {
        console.error('❌ Error getting total admins count:', error.message);
        res.status(500).json({ message: 'Error fetching admin count.' });
    }
};

// NEW: Get counts for users by status
exports.getUsersByStatusCount = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT status, COUNT(*) FROM users WHERE role = 'user' GROUP BY status"
        );
        // Transform result into an object for easier access { active: N, inactive: M, deleted: P, suspended: Q }
        const counts = {};
        result.rows.forEach(row => {
            counts[row.status] = parseInt(row.count);
        });
        res.status(200).json(counts);
    } catch (error) {
        console.error('❌ Error getting users by status count:', error.message);
        res.status(500).json({ message: 'Error fetching user status counts.' });
    }
};

// NEW: Get counts for admins by status
exports.getAdminsByStatusCount = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT status, COUNT(*) FROM users WHERE role = 'admin' GROUP BY status"
        );
        const counts = {};
        result.rows.forEach(row => {
            counts[row.status] = parseInt(row.count);
        });
        res.status(200).json(counts);
    } catch (error) {
        console.error('❌ Error getting admins by status count:', error.message);
        res.status(500).json({ message: 'Error fetching admin status counts.' });
    }
};

// --- NEW FUNCTION: Get Total Courses Count ---
exports.getTotalCoursesCount = async (req, res) => {
    try {
        // Ensure the table name 'courses' is correct for your PostgreSQL database
        const result = await pool.query('SELECT COUNT(*) FROM "courses"');
        const totalCount = parseInt(result.rows[0].count, 10);
        res.json({ count: totalCount });
    } catch (error) {
        console.error('Error fetching total courses count in SuperAdminController:', error);
        res.status(500).json({ message: 'Failed to fetch total courses count', error: error.message });
    }
};

// --- NEW FUNCTION: Get Course Type Counts ---
exports.getCourseTypeCounts = async (req, res) => {
    try {
        // Query to get counts for each type from the 'courses' table
        const result = await pool.query(
            `SELECT type, COUNT(*) FROM "courses" GROUP BY type`
        );
        // Transform the result into an object { Speaking: N, Listening: M, Writing: P, Reading: Q }
        const counts = {};
        result.rows.forEach(row => {
            counts[row.type] = parseInt(row.count, 10);
        });
        res.status(200).json(counts);
    } catch (error) {
        console.error('Error fetching course type counts in SuperAdminController:', error);
        res.status(500).json({ message: 'Failed to fetch course type counts', error: error.message });
    }
};