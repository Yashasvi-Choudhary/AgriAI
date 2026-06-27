import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { verifyResetToken, submitNewPassword } from '../services/api';
import { validatePassword } from '../utils/validators';

function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function validateToken() {
      try {
        const data = await verifyResetToken(token);
        setTokenValid(data.success);
        setMessage(data.success ? 'Please enter a new password.' : 'Invalid or expired reset token.');
      } catch (err) {
        setTokenValid(false);
        setError(err.response?.data?.message || 'Unable to verify token.');
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const data = await submitNewPassword(token, password, confirmPassword);
      setMessage(data.message || 'Your password has been reset successfully.');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Reset Password</h1>
      <p>{tokenValid ? 'Enter your new password below.' : 'Token validation is in progress.'}</p>

      {tokenValid ? (
        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      ) : null}

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default ResetPassword;
