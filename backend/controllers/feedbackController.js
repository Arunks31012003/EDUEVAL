const nodemailer = require('nodemailer');
require('dotenv').config();

// Check if SMTP environment variables are configured
const hasSMTPConfig = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_USER;

let transporter;
if (hasSMTPConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

exports.sendFeedback = async (req, res) => {
  try {
    const { email, id, feedback } = req.body;
    if (!email || !id || !feedback) {
      return res.status(400).json({ message: 'Email, id and feedback are required' });
    }

    // If SMTP is not configured, just log the feedback and return success
    if (!hasSMTPConfig) {
      console.log('Feedback received (SMTP not configured):', {
        email,
        id,
        feedback,
        timestamp: new Date().toISOString()
      });
      
      return res.status(200).json({ 
        message: 'Feedback received successfully (email notification disabled)',
        note: 'SMTP configuration missing - feedback logged to console'
      });
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.EMAIL_USER,
      subject: `Feedback from user ${id}`,
      text: `User Email: ${email}\nUser ID: ${id}\nFeedback:\n${feedback}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Feedback sent successfully' });
  } catch (error) {
    console.error('Error sending feedback email:', error);
    res.status(500).json({ 
      message: 'Failed to send feedback email',
      error: error.message 
    });
  }
};
