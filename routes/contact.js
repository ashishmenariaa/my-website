const express = require('express');
const router = express.Router();
const { sendEmail } = require('../config/email');

router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address'
            });
        }

        const sent = await sendEmail(
            process.env.EMAIL_USER,
            `New Contact: ${subject}`,
            `<p><strong>From:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong></p>
             <p>${message}</p>`
        );

        if (sent) {
            res.json({
                success: true,
                message: 'Message sent successfully!'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send message'
            });
        }

    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;