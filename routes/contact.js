const express = require('express');
const router = express.Router();
const transporter = require('../config/email');
const { contactFormEmail } = require('../config/emailTemplates');

// POST /api/contact - Handle contact form submissions
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        // Prepare email
        const mailOptions = contactFormEmail(name, email, subject, message);

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Message sent successfully! We will get back to you soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
});

module.exports = router;