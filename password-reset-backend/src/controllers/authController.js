const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { validateEmail, validatePassword } = require('../utils/validators');
const { sendResetPasswordEmail } = require('../utils/email');

const TOKEN_LENGTH_BYTES = 32;
const TOKEN_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 12;

function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const db = getDb();
    const [rows] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      // Always return success to prevent account enumeration.
      return res.json({ success: true, message: 'If this email is registered, you will receive a password reset link shortly.' });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [token, expiresAt, rows[0].id]
    );

    await sendResetPasswordEmail(email, token);

    return res.json({ success: true, message: 'If this email is registered, you will receive a password reset link shortly.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process the request right now. Please try again later.' });
  }
}

async function verifyResetToken(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is missing.' });
    }

    const db = getDb();
    const [rows] = await db.execute(
      'SELECT id, reset_token_expiry FROM users WHERE reset_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    const user = rows[0];
    const expiry = new Date(user.reset_token_expiry);
    if (!expiry || expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'This token has expired.' });
    }

    return res.json({ success: true, message: 'Token is valid.' });
  } catch (error) {
    console.error('verifyResetToken error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify token right now.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is missing.' });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both password fields.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }

    const db = getDb();
    const [rows] = await db.execute(
      'SELECT id, reset_token_expiry FROM users WHERE reset_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    const user = rows[0];
    const expiry = new Date(user.reset_token_expiry);
    if (!expiry || expiry < new Date()) {
      return res.status(400).json({ success: false, message: 'This token has expired.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    return res.json({ success: true, message: 'Your password has been reset successfully.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset password right now.' });
  }
}

module.exports = {
  forgotPassword,
  verifyResetToken,
  resetPassword,
};
