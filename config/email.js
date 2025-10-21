// config/email.js
const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not set');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized');
}

const sendEmail = async (to, subject, html) => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_USER || 'help.sdzone@gmail.com',
      subject,
      html
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

module.exports = { sendEmail };