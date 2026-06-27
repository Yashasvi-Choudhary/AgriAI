import os
import sqlite3
import unittest

from app import app


class PasswordResetFlowTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True
        self.db_path = "database.db"

    def tearDown(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE LOWER(email) = 'reset-test-user@example.com' OR LOWER(email) = 'mixedcase.user@example.com'")
        conn.commit()
        conn.close()

    def test_forgot_and_reset_password_pages_render(self):
        forgot_resp = self.client.get('/forgot-password')
        self.assertEqual(forgot_resp.status_code, 200)
        self.assertIn(b'Forgot Password', forgot_resp.data)

        reset_resp = self.client.get('/reset-password?token=test-token')
        self.assertEqual(reset_resp.status_code, 200)
        self.assertIn(b'Reset Password', reset_resp.data)

    def test_forgot_password_creates_reset_token_and_reset_password_updates_password(self):
        email = 'reset-test-user@example.com'
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
            ('Reset Test', email, '9999999999', 'hashed-old-password')
        )
        conn.commit()
        conn.close()

        forgot_resp = self.client.post('/auth/forgot-password', json={'email': email})
        self.assertEqual(forgot_resp.status_code, 200)
        payload = forgot_resp.get_json()
        self.assertTrue(payload['success'])
        self.assertIn('reset_link', payload)

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT reset_token FROM users WHERE email = ?", (email,))
        token = cur.fetchone()[0]
        conn.close()
        self.assertIsNotNone(token)

        reset_resp = self.client.post('/auth/reset-password', json={
            'token': token,
            'password': 'NewSecure123!'
        })
        self.assertEqual(reset_resp.status_code, 200)
        self.assertTrue(reset_resp.get_json()['success'])

    def test_forgot_password_matches_registered_email_case_insensitively(self):
        email = 'MixedCase.User@Example.com'
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
            ('Mixed Case', email, '1234567890', 'hashed-old-password')
        )
        conn.commit()
        conn.close()

        forgot_resp = self.client.post('/forgot-password', json={'email': 'mixedcase.user@example.com'})
        self.assertEqual(forgot_resp.status_code, 200)
        self.assertTrue(forgot_resp.get_json()['success'])


if __name__ == '__main__':
    unittest.main()
