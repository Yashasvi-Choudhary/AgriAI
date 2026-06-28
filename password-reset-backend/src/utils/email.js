const nodemailer = require('nodemailer');
const { email: emailConfig, frontendUrl } = require('../config');

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth,
});

async function sendResetPasswordEmail(to, token) {
  const resetLink = `${frontendUrl}/reset-password/${encodeURIComponent(token)}`;
  const mailOptions = {
    from: emailConfig.from,
    to,
    subject: 'Reset Your labhansh.ai Password',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>labhansh.ai Password Reset</h2>
        <p>You requested a password reset for your account.</p>
        <p>Please click the button below to reset your password. This link expires in 15 minutes.</p>
        <a href="${resetLink}" style="background-color: #1f8ef1; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p>If the button does not work, paste this link into your browser:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request a password reset, ignore this email.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">labhansh.ai Security Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendResetPasswordEmail,
};
