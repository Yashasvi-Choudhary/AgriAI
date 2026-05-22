"""
Setup script for Plant Disease Detection System
Initializes model directories and verifies dependencies
Run this once before training the model
"""

import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def setup_directories():
    """Create necessary directories for the disease detection system"""
    directories = [
        os.path.join(BASE_DIR, "model"),
        os.path.join(BASE_DIR, "data", "disease_detection", "train"),
        os.path.join(BASE_DIR, "data", "disease_detection", "valid"),
        os.path.join(BASE_DIR, "static", "uploads", "disease_images")
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✅ Directory ready: {directory}")

def verify_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'flask',
        'tensorflow',
        'PIL',
        'numpy',
        'requests'
    ]
    
    print("\n📦 Checking dependencies...")
    missing = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All dependencies installed!")
    return True

def verify_dataset():
    """Check if training data is available"""
    train_dir = os.path.join(BASE_DIR, "data", "disease_detection", "train")
    
    if not os.path.exists(train_dir):
        print("\n⚠️  Training data not found!")
        print(f"Please structure your data in: {train_dir}")
        return False
    
    classes = os.listdir(train_dir)
    if not classes:
        print("\n⚠️  No disease classes found in training directory!")
        return False
    
    print(f"\n✅ Found {len(classes)} disease classes:")
    for cls in sorted(classes)[:5]:
        print(f"   - {cls}")
    if len(classes) > 5:
        print(f"   ... and {len(classes) - 5} more")
    
    return True

def create_placeholder_classes():
    """Create a placeholder disease_classes.json"""
    classes_path = os.path.join(BASE_DIR, "model", "disease_classes.json")
    
    if not os.path.exists(classes_path):
        placeholder = {
            "Apple___Apple_scab": 0,
            "Apple___Black_rot": 1,
            "Tomato___Early_blight": 2,
            "Tomato___healthy": 3
        }
        with open(classes_path, 'w') as f:
            json.dump(placeholder, f)
        print(f"\n✅ Placeholder classes file created: {classes_path}")
        print("   (Will be updated when model is trained)")

def main():
    """Run setup"""
    print("=" * 60)
    print("🌿 Plant Disease Detection System - Setup")
    print("=" * 60)
    
    setup_directories()
    verify_dependencies()
    verify_dataset()
    create_placeholder_classes()
    
    print("\n" + "=" * 60)
    print("✅ Setup complete!")
    print("\n📋 Next steps:")
    print("1. Ensure data/disease_detection/train/ contains class folders")
    print("2. Run: python train_disease_model.py")
    print("3. Start Flask app: python app.py")
    print("=" * 60)

if __name__ == "__main__":
    main()
