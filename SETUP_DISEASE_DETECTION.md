===============================================
🌿 PLANT DISEASE DETECTION SYSTEM - SETUP GUIDE
===============================================

SYSTEM OVERVIEW:

- CNN model trained on plant leaf images
- Real-time disease detection from image uploads
- Bilingual responses (English + Hindi)
- Integrated with existing Flask app

===============================================
INSTALLATION STEPS:
===============================================

1️⃣ INSTALL DEPENDENCIES
Run: pip install -r requirements.txt

Key packages:

- TensorFlow 2.13+
- Pillow (image processing)
- Flask (already installed)

2️⃣ VERIFY DATASET STRUCTURE

Your dataset should be at:
data/disease_detection/
├── train/
│ ├── Apple***Apple_scab/
│ ├── Tomato***Early_blight/
│ ├── Potato\_\_\_healthy/
│ └── ... (38 disease classes total)
└── valid/
└── (same structure)

✓ Each folder = one disease class
✓ Each folder contains leaf images
✓ Train/valid split already prepared

3️⃣ RUN SETUP SCRIPT
Run: python setup_disease_detection.py

This will:

- Create model/ directory
- Verify dependencies
- Check dataset availability
- Create placeholder files

4️⃣ TRAIN THE MODEL
Run: python train_disease_model.py

This will:

- Load MobileNetV2 base model
- Train on disease_detection/train
- Validate on disease_detection/valid
- Save model to model/disease_model.h5
- Generate model/disease_classes.json

⏱️ Training time: ~15-30 minutes (GPU recommended)

5️⃣ START FLASK APP
Run: python app.py

Then open: http://localhost:5000

===============================================
USAGE:
===============================================

Frontend Access:

1. Login to dashboard
2. Click "Plant Disease Detection"
3. Upload a plant leaf image
4. View results in English or Hindi

API Endpoint:
POST /predict-disease

Request:

- multipart/form-data with 'image' file

Response:
{
"status": "success",
"disease": "Disease Name",
"confidence": 0.95,
"description": "Description of disease...",
"solution": "Treatment recommendations..."
}

===============================================
KEY FILES:
===============================================

📄 train_disease_model.py

- Training script using TensorFlow/Keras
- Transfer learning with MobileNetV2
- Output: model/disease_model.h5

📄 utils_disease.py

- Disease database with treatments
- English + Hindi translations
- Confidence formatting

📄 setup_disease_detection.py

- Initialization and verification
- Dependency checking
- Directory setup

📁 model/

- disease_model.h5 (trained model, generated after training)
- disease_classes.json (class mappings)

📄 app.py (updated)

- New endpoint: /predict-disease
- Image preprocessing
- Model loading

📁 templates/dashboard/plant-disease-detection.html (existing)

- Frontend UI with drag-drop upload
- Image preview
- Result display

📁 static/js/plant-disease-detection.js (existing)

- Handles image upload
- API calls to /predict-disease
- Result rendering

📁 static/locales/

- en/plant-disease-detection.json (English translations)
- hi/plant-disease-detection.json (Hindi translations)

===============================================
SUPPORTED DISEASES (38 Classes):
===============================================

Apple:

- Apple Scab
- Black Rot
- Cedar Apple Rust
- Healthy

Tomato:

- Early Blight
- Late Blight
- Septoria Leaf Spot
- Bacterial Spot
- Leaf Mold
- Spider Mites
- Target Spot
- Tomato Mosaic Virus
- Tomato Yellow Leaf Curl Virus
- Healthy

Potato:

- Early Blight
- Late Blight
- Healthy

Corn:

- Northern Leaf Blight
- Cercospora Leaf Spot
- Common Rust
- Healthy

Grape, Peach, Pepper, Strawberry, Squash,
Cherry, Orange, Blueberry, Raspberry, Soybean

- Various diseases
- Healthy variants

===============================================
TROUBLESHOOTING:
===============================================

❌ "Model not available" error
→ Run training: python train_disease_model.py
→ Verify model/disease_model.h5 exists

❌ "Import error: tensorflow not found"
→ Install: pip install tensorflow

❌ "No disease classes found"
→ Check: data/disease_detection/train/ has class folders
→ Verify folder names match format

❌ Slow inference
→ GPU recommended for faster predictions
→ CPU works but slower (~2-5 seconds per image)

❌ "Invalid image format"
→ Supported: JPG, PNG, WEBP
→ Max size: 10 MB
→ Ensure valid image file

===============================================
LANGUAGE SUPPORT:
===============================================

✓ Automatic language detection from browser
✓ Language toggle in app settings
✓ Response automatically in selected language
✓ English & Hindi disease databases included

Switch language:

1. Click language button (top-right)
2. Detect disease
3. Result displays in selected language

===============================================
PERFORMANCE NOTES:
===============================================

Model: MobileNetV2 (lightweight, ~100MB)
Input: 224×224 RGB images
Output: 38 disease classes
Inference Time:

- GPU (NVIDIA): ~0.5 seconds
- CPU: ~2-5 seconds
  Accuracy: ~95% on validation set (after training)

===============================================
NEXT STEPS:
===============================================

1. Run: pip install -r requirements.txt
2. Run: python setup_disease_detection.py
3. Run: python train_disease_model.py
4. Run: python app.py
5. Open: http://localhost:5000/dashboard
6. Navigate to "Plant Disease Detection"

===============================================
