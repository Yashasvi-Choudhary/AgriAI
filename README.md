# AgriAI - Agricultural Intelligence Platform

## Forgot password flow

The app now includes a working forgot-password experience:

1. The user clicks Forgot Password on the login page.
2. The app asks for the registered email address.
3. If the account exists, the server creates a one-time reset token and stores it in the database.
4. A reset link is generated and emailed to the user.
5. When the user opens the link, they can enter a new password.
6. The server validates the token, updates the password, and clears the token so it cannot be reused.

### Email configuration

Set these environment variables before running the app:

- MAIL_SERVER
- MAIL_PORT
- MAIL_USE_TLS
- MAIL_USERNAME
- MAIL_PASSWORD

Example:

```bash
set MAIL_SERVER=smtp.gmail.com
set MAIL_PORT=587
set MAIL_USE_TLS=True
set MAIL_USERNAME=your_email@gmail.com
set MAIL_PASSWORD=your_app_password
```

### Test the flow

```bash
c:/Users/yasha/Documents/AgriAI/.venv/Scripts/python.exe -m unittest tests.test_auth_password_reset
```
