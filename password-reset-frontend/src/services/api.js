import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/auth';

export async function requestPasswordReset(email) {
  const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
  return response.data;
}

export async function verifyResetToken(token) {
  const response = await axios.get(`${API_BASE_URL}/reset-password/${encodeURIComponent(token)}`);
  return response.data;
}

export async function submitNewPassword(token, password, confirmPassword) {
  const response = await axios.post(`${API_BASE_URL}/reset-password/${encodeURIComponent(token)}`, {
    password,
    confirmPassword,
  });
  return response.data;
}
