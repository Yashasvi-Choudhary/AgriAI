import os

# Configuration file
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() in ("1", "true", "yes", "on")
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_key_123")
