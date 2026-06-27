import { useState } from 'react';
import { requestPasswordReset } from '../services/api';
import { validateEmail } from '../utils/validators';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const data = await requestPasswordReset(email);
      setMessage(data.message || 'If the email is registered, a reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send reset link. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>Forgot Password</h1>
      <p>Enter your registered email to receive a reset link.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default ForgotPassword;
