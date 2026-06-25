#!/usr/bin/env python
"""Test Crop Yield Prediction Integration"""

import json
from app import app

def test_yield_prediction():
    tests = [
        ("Rice", {"crop": "rice", "area": 50, "rainfall": 1000, "temperature": 24, "soil_type": "loamy", "fertilizer_usage": 30, "irrigation": 2}),
        ("Wheat", {"crop": "wheat", "area": 200, "rainfall": 600, "temperature": 20, "soil_type": "sandy", "fertilizer_usage": 100, "irrigation": 8}),
        ("Maize", {"crop": "maize", "area": 100, "rainfall": 800, "temperature": 25, "soil_type": "clay", "fertilizer_usage": 60, "irrigation": 5}),
    ]

    print("\n" + "="*60)
    print("CROP YIELD PREDICTION INTEGRATION TEST")
    print("="*60 + "\n")

    with app.test_client() as client:
        for name, data in tests:
            response = client.post("/predict-yield", json=data, content_type="application/json")
            result = response.get_json()
            
            if result["status"] == "success":
                en_data = result["data"]["yield_prediction"]["english"]
                hi_data = result["data"]["yield_prediction"]["hindi"]
                print(f"✓ {name}")
                print(f"  English: {en_data['predicted_yield']} {en_data['unit']}")
                print(f"  Hindi: {hi_data['predicted_yield']} {hi_data['unit']}")
                print(f"  Analysis (EN): {en_data['analysis']}")
                print()
            else:
                print(f"✗ {name}: {result.get('message', 'Unknown error')}\n")

    print("="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_yield_prediction()
