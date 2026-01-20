const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();

// Contact form endpoint
router.post('/send', async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, subject, and message are required' 
      });
    }

    // Check SMTP configuration
    const hasSMTPConfig = process.env.SMTP_HOST && 
                         process.env.SMTP_PORT && 
                         process.env.SMTP_USER && 
                         process.env.SMTP_PASS;

    if (!hasSMTPConfig) {
      console.log('Contact form submission:', { email, subject, message });
      return res.status(200).json({ 
        success: true,
        message: 'Message received successfully (email notification disabled)' 
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.EMAIL_USER || process.env.SMTP_USER,
      subject: `Contact Form: ${subject}`,
      text: `From: ${email}\n\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true,
      message: 'Message sent successfully' 
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send message',
      error: error.message 
    });
  }
});

module.exports = router;
