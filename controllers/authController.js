// backend/controllers/AuthController.js
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Ensure this matches your .env JWT_SECRET

// In-memory map for OTP cooldowns (email -> last sent timestamp)
const otpCooldowns = new Map();

// Password strength validation function
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return 'Password must be at least 8 characters long.';
  }
  if (!hasUpperCase) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!hasLowerCase) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!hasNumbers) {
    return 'Password must contain at least one number.';
  }
  if (!hasSpecialChar) {
    return 'Password must contain at least one special character.';
  }
  return null; // valid
};

// ==================== REGISTER ====================
exports.registerUser = async (req, res) => {
  const { username, email, phone, password } = req.body;

  try {
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure 'role' and 'status' are set correctly for new registrations
    const newUser = await pool.query(
      'INSERT INTO users (username, email, phone, password, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, username, email, phone, role, status',
      [username, email, phone, hashedPassword, 'user', 'active'] // Default new users to 'user' role and 'active' status
    );

    res.status(201).json({ user: newUser.rows[0] });
  } catch (err) {
    console.error("❌ Registration error:", err.message);
    res.status(500).send('Server error');
  }
};

// ==================== LOGIN ====================
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`[LOGIN ATTEMPT] Email: ${email}`); // Log the attempted email

    const result = await pool.query(
      'SELECT id, username, email, phone, password, role, status FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER($1))',
      // ^^^^^^^^^ IMPORTANT: Ensure 'status' column is selected here
      [email]
    );

    const user = result.rows[0];
    console.log('[LOGIN DEBUG] User object from DB:', user); // Detailed user object retrieved

    if (!user) {
      console.log('[LOGIN DEBUG] User not found or email/password invalid.');
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // --- THE CRITICAL STATUS CHECK ---
    console.log(`[LOGIN DEBUG] User status from DB for ${user.email}: '${user.status}'`);
    // Ensure the string 'active' exactly matches your desired active status value in the database
    if (user.status !== 'active') {
        console.warn(`[LOGIN BLOCKED] User ${user.email} (ID: ${user.id}) account is not active (Status: ${user.status}).`);
        let errorMessage = 'Your account is not active. Please contact support.';
        if (user.status === 'deleted') {
            errorMessage = 'Your account has been deactivated. Please contact support.';
        } else if (user.status === 'suspended') {
            errorMessage = 'Your account is suspended. Please contact support.';
        }
        return res.status(403).json({ message: errorMessage });
    }

    // --- PASSWORD CHECK ---
    console.log('[LOGIN DEBUG] User status is active. Proceeding to password comparison...');
    const isMatch = await bcrypt.compare(password, user.password); // Assuming 'user.password' holds the hashed password
    console.log(`[LOGIN DEBUG] Password match result for ${user.email}: ${isMatch}`);

    if (!isMatch) {
      console.log('[LOGIN DEBUG] Password does not match for user:', user.email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // --- SUCCESSFUL LOGIN (This block should NOT be reached for a 'deleted' user) ---
    console.log('[LOGIN DEBUG] User authenticated successfully. Generating token...');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, // Payload for the JWT token
      SECRET_KEY,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Prepare user object for the response, including status
    const { id, username, phone, role, status } = user;
    res.status(200).json({
      user: { id, username, email, phone, role, status }, // Include status in the response
      token
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).send('Server error');
  }
};

// ==================== FORGOT PASSWORD: SEND OTP ====================
exports.sendResetOTP = async (req, res) => {
  const { email } = req.body;
  const now = Date.now();

  // Check cooldown (1 minute)
  if (otpCooldowns.has(email) && now - otpCooldowns.get(email) < 60000) {
    return res.status(429).json({ message: 'Please wait 1 minute before requesting another OTP.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured');
      return res.status(500).json({ message: 'Email service not configured. Please contact support.' });
    }

    const userCheckResult = await pool.query('SELECT status FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER($1))', [email]);
    if (userCheckResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const userStatus = userCheckResult.rows[0].status;
    if (userStatus === 'deleted' || userStatus === 'suspended') {
        console.warn(`[OTP BLOCKED] Attempted OTP reset for a ${userStatus} account: ${email}`);
        return res.status(403).json({ message: 'Cannot reset password for this account. Please contact support.' });
    }

    await pool.query(
      'UPDATE users SET reset_otp = $1, otp_expires_at = $2 WHERE TRIM(LOWER(email)) = TRIM(LOWER($3))',
      [otp, expiresAt, email]
    );

    // Send Email configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset OTP</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Your OTP is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <p>Thank you!</p>
          <p>The PracticeIELTS Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent to email: ${email}`);

    // Set cooldown
    otpCooldowns.set(email, now);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error("❌ OTP send error:", err.message);
    res.status(500).send('Server error');
  }
};

// ==================== VERIFY OTP ====================
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER($1)) AND reset_otp = $2 AND otp_expires_at > NOW()',
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error("❌ OTP verification error:", err.message);
    res.status(500).send('Server error');
  }
};

// ==================== RESET PASSWORD ====================
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  // Validate password strength
  const validationError = validatePasswordStrength(newPassword);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, reset_otp = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).send('Server error');
  }
};

// ==================== WELCOME MESSAGE ====================
exports.welcomeMessage = async (req, res) => {
  try {
    // Log the request method and path
    console.log(`Request received: ${req.method} ${req.path}`);

    // Return JSON response with welcome message
    res.status(200).json({ message: 'Welcome to the API!' });
  } catch (error) {
    console.error('Error in welcome endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== GET PROFILE ====================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // User ID comes from the authenticated token

    const result = await pool.query(
      'SELECT id, username, email, role, status FROM users WHERE id = $1', // Ensure 'status' is selected
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
