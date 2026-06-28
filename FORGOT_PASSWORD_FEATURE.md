# Forgot Password Feature for labhansh.ai

## Overview
This implementation adds a complete password reset flow as a standalone Node.js + Express.js backend and a React.js frontend.

## Folder Structure

- `password-reset-backend/`
  - `src/app.js`
  - `src/config.js`
  - `src/db.js`
  - `src/routes/authRoutes.js`
  - `src/controllers/authController.js`
  - `src/utils/email.js`
  - `src/utils/validators.js`
  - `.env.example`
  - `mysql/alter_users_table.sql`

- `password-reset-frontend/`
  - `public/index.html`
  - `src/index.js`
  - `src/App.js`
  - `src/App.css`
  - `src/pages/ForgotPassword.js`
  - `src/pages/ResetPassword.js`
  - `src/services/api.js`
  - `src/utils/validators.js`
  - `.env.example`

## MySQL Schema Changes

Apply this migration to add reset token support to the `users` table:

```sql
ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(128) NULL,
  ADD COLUMN reset_token_expiry DATETIME NULL;
```

If you need a full `users` table definition:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  reset_token VARCHAR(128) NULL,
  reset_token_expiry DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Backend API Routes

- `POST /api/auth/forgot-password`
  - Request body: `{ email }`
  - Validates email format
  - Stores `reset_token` and `reset_token_expiry`
  - Sends email with reset link
  - Returns generic success message to prevent enumeration

- `GET /api/auth/reset-password/:token`
  - Verifies token exists and is not expired
  - Returns token validity state

- `POST /api/auth/reset-password/:token`
  - Request body: `{ password, confirmPassword }`
  - Validates password strength and match
  - Hashes password with bcrypt
  - Clears token fields after successful reset

## Email Template

Password reset email is generated in `password-reset-backend/src/utils/email.js` and includes a button link:

- Subject: `Reset Your labhansh.ai Password`
- Link: `${FRONTEND_URL}/reset-password/:token`
- 15-minute expiration warning

## React Frontend Pages

- `/forgot-password`
  - Enter registered email
  - Validates email format
  - Displays success/error messages

- `/reset-password/:token`
  - Verifies token via backend
  - Accepts new password and confirm password
  - Validates strength and equality
  - Displays success/error messages

## Validation Rules

- Email format: standard RFC-style email regex
- Password strength:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

## Security Notes

- Passwords are hashed using `bcrypt` with 12 salt rounds
- Tokens are random 64-character hex values generated with Node.js `crypto`
- Reset data is cleared after successful password reset
- Expired or invalid tokens return proper error responses
- Backend response messages are intentionally generic for `forgot-password`

## Setup & Integration Steps

1. Install backend dependencies:

```bash
cd password-reset-backend
npm install
```

2. Create `.env` from `.env.example` and set:

- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USER`
- `DB_PASSWORD`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`
- `FRONTEND_URL`

3. Install frontend dependencies:

```bash
cd ../password-reset-frontend
npm install
```

4. Create frontend `.env` from `.env.example` and set `REACT_APP_API_URL`.

5. Run backend:

```bash
cd password-reset-backend
npm run dev
```

6. Run frontend:

```bash
cd ../password-reset-frontend
npm start
```

7. Use the pages:

- `http://localhost:3000/forgot-password`
- `http://localhost:3000/reset-password/<token>`

## Deployment Notes

- In production, set `FRONTEND_URL` to your deployed frontend URL.
- Use secure SMTP settings and `EMAIL_SECURE=true` if using port 465.
- Make sure `DB_PASSWORD` is stored securely.
- Use HTTPS for both frontend and backend.
