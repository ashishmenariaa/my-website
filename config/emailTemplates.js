// 1. Contact Form Email (to YOU)
const contactFormEmail = (name, email, subject, message) => {
    return {
        from: 'SD Zone <help.sdzone@gmail.com>',
        to: 'help.sdzone@gmail.com',
        subject: `New Contact Form: ${subject}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-row { margin: 15px 0; }
                    .label { font-weight: bold; color: #00f2fe; }
                    .message-box { background: white; padding: 20px; border-left: 4px solid #00f2fe; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📨 New Contact Form Submission</h2>
                    </div>
                    <div class="content">
                        <div class="info-row">
                            <span class="label">From:</span> ${name}
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span> ${email}
                        </div>
                        <div class="info-row">
                            <span class="label">Subject:</span> ${subject}
                        </div>
                        <div class="message-box">
                            <strong>Message:</strong><br><br>
                            ${message}
                        </div>
                        <p style="margin-top: 30px; color: #666; font-size: 14px;">
                            Reply to: <a href="mailto:${email}">${email}</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
};

// 2. Forgot Password Email (to USER)
const forgotPasswordEmail = (userEmail, resetToken, userName) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    
    return {
        from: 'SD Zone <help.sdzone@gmail.com>',
        to: userEmail,
        subject: 'Password Reset Request - SD Zone',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName || 'there'},</p>
                        <p>We received a request to reset your password for your SD Zone account.</p>
                        <p>Click the button below to create a new password:</p>
                        <center>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </center>
                        <div class="warning">
                            <strong>⚠️ Important:</strong>
                            <ul>
                                <li>This link expires in <strong>1 hour</strong></li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Never share this link with anyone</li>
                            </ul>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 14px;">
                            Best regards,<br>
                            <strong>SD Zone Team</strong><br>
                            help.sdzone@gmail.com
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
};

// 3. Purchase Confirmation Email (to USER)
const purchaseConfirmationEmail = (userEmail, userName, planDetails) => {
    return {
        from: 'SD Zone <help.sdzone@gmail.com>',
        to: userEmail,
        subject: `Welcome to ${planDetails.name} Plan! 🎉`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; }
                    .plan-box { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; border: 2px solid #43e97b; }
                    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .label { font-weight: bold; color: #666; }
                    .value { color: #00f2fe; font-weight: bold; }
                    .success-badge { background: #43e97b; color: white; padding: 8px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Purchase Successful!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName},</p>
                        <p>Thank you for choosing SD Zone! Your subscription has been activated successfully.</p>
                        
                        <div class="plan-box">
                            <h2 style="color: #00f2fe; margin-top: 0;">📊 ${planDetails.name}</h2>
                            <div class="detail-row">
                                <span class="label">Plan Price:</span>
                                <span class="value">₹${planDetails.price}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Duration:</span>
                                <span class="value">${planDetails.duration} days</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Activated On:</span>
                                <span class="value">${new Date().toLocaleDateString('en-IN')}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Expires On:</span>
                                <span class="value">${planDetails.expiryDate}</span>
                            </div>
                        </div>

                        <div class="success-badge">✓ Account Activated</div>

                        <h3 style="color: #00f2fe;">🚀 What's Next?</h3>
                        <ul>
                            <li>Access premium trading signals</li>
                            <li>Get real-time zone alerts</li>
                            <li>Join our Telegram community</li>
                            <li>24/7 priority support</li>
                        </ul>

                        <p style="background: #e8f5ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <strong>💡 Pro Tip:</strong> Check your dashboard for the latest market analysis and trading zones!
                        </p>

                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="color: #666;">
                            Need help? Contact us:<br>
                            📧 help.sdzone@gmail.com<br>
                            💬 <a href="https://t.me/ashishmenaria">Telegram Support</a>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Happy Trading!<br>
                            <strong>SD Zone Team</strong>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
};

// 4. Subscription Expiry Warning Email (to USER)
const expiryWarningEmail = (userEmail, userName, daysRemaining, planName, renewalUrl) => {
    return {
        from: 'SD Zone <help.sdzone@gmail.com>',
        to: userEmail,
        subject: `⏰ Your ${planName} Plan Expires in ${daysRemaining} Days`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; }
                    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .countdown { font-size: 48px; font-weight: bold; color: #ff6b6b; text-align: center; margin: 20px 0; }
                    .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Subscription Expiring Soon</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${userName},</p>
                        
                        <div class="warning-box">
                            <strong>⚠️ Important Notice:</strong><br>
                            Your <strong>${planName}</strong> subscription will expire soon!
                        </div>

                        <div class="countdown">${daysRemaining} Days</div>
                        <p style="text-align: center; color: #666;">remaining in your subscription</p>

                        <h3 style="color: #00f2fe;">📉 What happens when it expires?</h3>
                        <ul>
                            <li>❌ No access to premium signals</li>
                            <li>❌ Real-time alerts will stop</li>
                            <li>❌ Support will be limited</li>
                            <li>❌ Trading zones won't update</li>
                        </ul>

                        <h3 style="color: #43e97b;">✅ Renew now to continue enjoying:</h3>
                        <ul>
                            <li>87% accurate trading signals</li>
                            <li>Real-time zone detection</li>
                            <li>24/7 priority support</li>
                            <li>Telegram community access</li>
                        </ul>

                        <center>
                            <a href="${renewalUrl}" class="button">Renew Now</a>
                        </center>

                        <p style="background: #e8f5ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <strong>🎁 Special Offer:</strong> Renew today and get exclusive bonuses!
                        </p>

                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p style="color: #666; font-size: 14px;">
                            Questions? We're here to help:<br>
                            📧 help.sdzone@gmail.com<br>
                            💬 <a href="https://t.me/ashishmenaria">Chat with us</a>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 20px;">
                            Best regards,<br>
                            <strong>SD Zone Team</strong>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
};

module.exports = {
    contactFormEmail,
    forgotPasswordEmail,
    purchaseConfirmationEmail,
    expiryWarningEmail
};