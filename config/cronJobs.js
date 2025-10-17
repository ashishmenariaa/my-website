const cron = require('node-cron');
const User = require('../models/user'); // Your user model (lowercase 'user')
const transporter = require('./email');
const { expiryWarningEmail } = require('./emailTemplates');

// Run daily at 9:00 AM
const checkExpiringSubscriptions = cron.schedule('0 9 * * *', async () => {
    try {
        console.log('🔍 Checking for expiring subscriptions...');

        const now = new Date();
        const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
        const sixDaysFromNow = new Date(now.getTime() + (6 * 24 * 60 * 60 * 1000));

        // Find users with subscriptions expiring in 5 days
        const expiringUsers = await User.find({
            'activePlan.endDate': {
                $gte: fiveDaysFromNow,
                $lt: sixDaysFromNow
            },
            expiryWarningEmailSent: { $ne: true } // Only send once
        });

        console.log(`📧 Found ${expiringUsers.length} subscriptions expiring in 5 days`);

        for (const user of expiringUsers) {
            try {
                // Calculate days remaining
                const daysRemaining = Math.ceil((user.activePlan.endDate - now) / (1000 * 60 * 60 * 24));

                // Renewal URL
                const renewalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/subscriptions.html`;

                // Send expiry warning email
                const mailOptions = expiryWarningEmail(
                    user.email,
                    user.name,
                    daysRemaining,
                    user.activePlan.name,
                    renewalUrl
                );

                await transporter.sendMail(mailOptions);

                // Mark email as sent
                user.expiryWarningEmailSent = true;
                await user.save();

                console.log(`✅ Expiry warning sent to: ${user.email} (${daysRemaining} days remaining)`);

            } catch (error) {
                console.error(`❌ Failed to send expiry warning to ${user.email}:`, error);
            }
        }

        console.log('✅ Expiry warning check completed');

    } catch (error) {
        console.error('❌ Cron job error:', error);
    }
});

// Optional: Reset warning flags when user renews
const resetExpiryWarnings = async (userId) => {
    try {
        await User.findByIdAndUpdate(userId, {
            expiryWarningEmailSent: false
        });
        console.log(`✅ Reset expiry warning flag for user: ${userId}`);
    } catch (error) {
        console.error('❌ Failed to reset expiry warning:', error);
    }
};

module.exports = { 
    checkExpiringSubscriptions,
    resetExpiryWarnings 
};