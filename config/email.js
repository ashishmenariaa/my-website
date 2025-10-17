const nodemailer = require('nodemailer');

console.log('📧 Nodemailer version:', nodemailer.VERSION || 'unknown');
console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('📧 Email Pass Length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Email error:', error.message);
    } else {
        console.log('✅ Email ready');
    }
});

module.exports = transporter;