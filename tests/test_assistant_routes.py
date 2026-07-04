import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routes.assistant_routes import detect_language, get_ai_response


class AssistantRouteTests(unittest.TestCase):
    def test_detect_language_hindi_query(self):
        self.assertEqual(detect_language("धान की सिंचाई कैसे करें?"), "hi")

    def test_detect_language_english_query(self):
        self.assertEqual(detect_language("How do I manage wheat disease?"), "en")

    def test_get_ai_response_stays_in_user_language(self):
        response = get_ai_response("धान में पत्तियों पर पीले दाग दिख रहे हैं", "hi")
        self.assertTrue(response)
        self.assertIn("धान", response)


if __name__ == "__main__":
    unittest.main()
