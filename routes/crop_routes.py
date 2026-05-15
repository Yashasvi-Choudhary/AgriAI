# Crop recommendation routes
import os
import sqlite3
import traceback
import pandas as pd
from flask import Blueprint, request, jsonify, current_app, session, redirect

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'crop_model.pkl')
DB_PATH = os.path.join(BASE_DIR, 'database.db')
_crop_model = None

VALID_SOIL_TYPES = {
    'alluvial',
    'black',
    'red',
    'laterite',
    'arid',
    'saline',
    'peaty',
    'forest',
}

FEATURE_COLUMNS = [
    'nitrogen',
    'phosphorus',
    'potassium',
    'temperature',
    'humidity',
    'ph',
    'rainfall',
]

crop = Blueprint('crop', __name__)


def generate_crop_response(crop, confidence, inputs):
    rainfall = inputs["rainfall"]
    ph = inputs["ph"]

    # Rule logic
    if rainfall > 200:
        reason_en = "High rainfall. Suitable for rice."
        reason_hi = "अधिक वर्षा। चावल के लिए उपयुक्त।"
    elif rainfall < 50:
        reason_en = "Low rainfall. Suitable for millet or maize."
        reason_hi = "कम वर्षा। बाजरा या मक्का के लिए उपयुक्त।"
    else:
        reason_en = "Balanced conditions for crop growth."
        reason_hi = "फसल के लिए संतुलित स्थिति।"

    if 6 <= ph <= 7.5:
        advice_en = "Soil pH is ideal."
        advice_hi = "मिट्टी का pH उपयुक्त है।"
    else:
        advice_en = "Improve soil pH."
        advice_hi = "मिट्टी के pH को सुधारें।"

    return {
        "status": "success",
        "data": {
            "crop_recommendation": {
                "english": {
                    "crop_name": crop,
                    "confidence": f"{round(confidence * 100, 2)}%",
                    "reason": reason_en,
                    "additional_advice": advice_en
                },
                "hindi": {
                    "crop_name": crop,
                    "confidence": f"{round(confidence * 100, 2)}%",
                    "reason": reason_hi,
                    "additional_advice": advice_hi
                }
            }
        }
    }


def connect_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def retrain_crop_model():
    try:
        from train_crop_model import train_model

        train_model()
    except Exception as exc:
        current_app.logger.error(
            "Crop model retrain failed: %s\n%s",
            exc,
            traceback.format_exc(),
        )


def load_crop_model():
    global _crop_model
    if _crop_model is not None:
        return _crop_model

    if not os.path.isfile(MODEL_PATH):
        current_app.logger.warning("Crop model missing. Attempting retrain.")
        retrain_crop_model()

    if not os.path.isfile(MODEL_PATH):
        current_app.logger.error("Crop model still missing after retrain: %s", MODEL_PATH)
        _crop_model = None
        return None

    try:
        import joblib

        _crop_model = joblib.load(MODEL_PATH)
        if hasattr(_crop_model, "feature_names_in_"):
            stored_features = [str(f) for f in _crop_model.feature_names_in_]
            if stored_features != FEATURE_COLUMNS:
                current_app.logger.warning(
                    "Crop model feature names mismatch: %s, expected: %s. Retraining model.",
                    stored_features,
                    FEATURE_COLUMNS,
                )
                _crop_model = None
                retrain_crop_model()
                if os.path.isfile(MODEL_PATH):
                    _crop_model = joblib.load(MODEL_PATH)
        current_app.logger.info("Crop model loaded successfully from %s", MODEL_PATH)
    except Exception as exc:
        current_app.logger.error(
            "Failed to load crop model from %s: %s\n%s",
            MODEL_PATH,
            exc,
            traceback.format_exc(),
        )
        _crop_model = None
        try:
            current_app.logger.warning("Attempting retrain after failed model load.")
            retrain_crop_model()
            if os.path.isfile(MODEL_PATH):
                import joblib

                _crop_model = joblib.load(MODEL_PATH)
        except Exception as retrain_exc:
            current_app.logger.error(
                "Failed to retrain crop model after load failure: %s\n%s",
                retrain_exc,
                traceback.format_exc(),
            )
            _crop_model = None
    return _crop_model


def parse_numeric_field(data, field_name, errors):
    value = data.get(field_name)
    if value is None or value == "":
        errors[field_name] = "Required"
        return None
    try:
        return float(value)
    except Exception:
        errors[field_name] = "Must be a number"
        return None


def build_bilingual_response(crop_name, confidence, alternatives):
    return {
        "english": {
            "recommended_crop": crop_name,
            "confidence": f"{confidence}%",
            "confidence_score": confidence,
            "alternatives": alternatives,
            "analysis": f"{crop_name} is predicted as the best crop for your soil and climate conditions with {confidence}% confidence.",
        },
        "hindi": {
            "recommended_crop": crop_name,
            "confidence": f"{confidence}%",
            "confidence_score": confidence,
            "alternatives": alternatives,
            "analysis": f"आपकी मिट्टी और जलवायु परिस्थितियों के अनुसार {crop_name} को {confidence}% विश्वसनीयता के साथ सर्वश्रेष्ठ फसल बताया गया है।",
        },
    }


@crop.route('/api/crop-recommendation', methods=['POST'])
def crop_recommendation_api():
    current_app.logger.info("=== CROP RECOMMENDATION API CALLED ===")
    current_app.logger.info("Request method: %s", request.method)
    current_app.logger.info("Request headers: %s", dict(request.headers))
    current_app.logger.info("Request data (raw): %s", request.data)
    
    if "user" not in session:
        current_app.logger.warning("User not in session")
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    data = request.get_json(silent=True)
    current_app.logger.info("Parsed JSON data: %s", data)
    
    if not data:
        current_app.logger.warning("Invalid JSON payload received for crop recommendation")
        return jsonify({"status": "error", "message": "Invalid JSON payload", "errors": {"payload": "Invalid JSON"}}), 400

    errors = {}
    soil_type = str(data.get("soil_type", "")).strip().lower()
    nitrogen = parse_numeric_field(data, "nitrogen", errors)
    phosphorus = parse_numeric_field(data, "phosphorus", errors)
    potassium = parse_numeric_field(data, "potassium", errors)
    temperature = parse_numeric_field(data, "temperature", errors)
    humidity = parse_numeric_field(data, "humidity", errors)
    ph = parse_numeric_field(data, "ph", errors)
    rainfall = parse_numeric_field(data, "rainfall", errors)

    if not soil_type:
        errors["soil_type"] = "Required"
    elif soil_type not in VALID_SOIL_TYPES:
        errors["soil_type"] = "Invalid soil type"

    if nitrogen is not None and (nitrogen < 0 or nitrogen > 500):
        errors["nitrogen"] = "Nitrogen must be between 0 and 500"
    if phosphorus is not None and (phosphorus < 0 or phosphorus > 500):
        errors["phosphorus"] = "Phosphorus must be between 0 and 500"
    if potassium is not None and (potassium < 0 or potassium > 500):
        errors["potassium"] = "Potassium must be between 0 and 500"
    if temperature is not None and (temperature < -20 or temperature > 60):
        errors["temperature"] = "Temperature must be between -20 and 60"
    if humidity is not None and (humidity < 0 or humidity > 100):
        errors["humidity"] = "Humidity must be between 0 and 100"
    if ph is not None and (ph < 0 or ph > 14):
        errors["ph"] = "pH must be between 0 and 14"
    if rainfall is not None and (rainfall < 0 or rainfall > 1000):
        errors["rainfall"] = "Rainfall must be between 0 and 1000"

    current_app.logger.info("Parsed fields - soil_type: %s, nitrogen: %s, phosphorus: %s, potassium: %s, temperature: %s, humidity: %s, ph: %s, rainfall: %s",
                          soil_type, nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall)

    if errors:
        current_app.logger.warning("Crop recommendation validation failed: %s", errors)
        return jsonify({"status": "error", "message": "Validation failed", "errors": errors}), 400

    current_app.logger.info("Validation passed. Loading model.")

    crop_model = load_crop_model()
    if crop_model is None:
        return jsonify({
            "status": "error",
            "message": "Model not available",
            "details": {"model_path": MODEL_PATH},
        }), 500

    feature_values = {
        "nitrogen": nitrogen,
        "phosphorus": phosphorus,
        "potassium": potassium,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall,
    }
    features = pd.DataFrame([feature_values], columns=FEATURE_COLUMNS)

    try:
        prediction = crop_model.predict(features)
        predicted_crop = str(prediction[0])
        confidence = 0.0
        alternatives = []

        current_app.logger.info("Prediction successful: crop=%s", predicted_crop)

        if hasattr(crop_model, "predict_proba"):
            probabilities = crop_model.predict_proba(features)[0]
            confidence = round(float(max(probabilities)) * 100, 2)
            if hasattr(crop_model, "classes_"):
                class_labels = [str(x) for x in crop_model.classes_]
                ranked = sorted(
                    zip(class_labels, probabilities), key=lambda item: item[1], reverse=True
                )
                alternatives = [name for name, _ in ranked if name != predicted_crop][:3]
        else:
            confidence = 0.0

        current_app.logger.info("Confidence: %s%%, Alternatives: %s", confidence, alternatives)

    except Exception as exc:
        current_app.logger.error(
            "Crop prediction failed: %s\n%s",
            exc,
            traceback.format_exc(),
        )
        return jsonify({"status": "error", "message": "Prediction failed", "details": {"exception": str(exc)}}), 500

    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 1 FROM crop_recommendations
            WHERE user_id = ?
              AND soil_type = ?
              AND nitrogen = ?
              AND phosphorus = ?
              AND potassium = ?
              AND ph = ?
              AND temperature = ?
              AND humidity = ?
              AND rainfall = ?
              AND latitude = ?
              AND longitude = ?
              AND recommended_crop = ?
              AND confidence = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (
                session["user"]["id"],
                soil_type,
                nitrogen,
                phosphorus,
                potassium,
                ph,
                temperature,
                humidity,
                rainfall,
                float(data.get("latitude") or 0),
                float(data.get("longitude") or 0),
                predicted_crop,
                confidence,
            ),
        )
        duplicate = cursor.fetchone()
        if not duplicate:
            cursor.execute(
                """
                INSERT INTO crop_recommendations
                (user_id, soil_type, nitrogen, phosphorus, potassium, ph, temperature, humidity, rainfall, latitude, longitude, recommended_crop, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session["user"]["id"],
                    soil_type,
                    nitrogen,
                    phosphorus,
                    potassium,
                    ph,
                    temperature,
                    humidity,
                    rainfall,
                    float(data.get("latitude") or 0),
                    float(data.get("longitude") or 0),
                    predicted_crop,
                    confidence,
                ),
            )
            conn.commit()
            current_app.logger.info("Recommendation saved to database successfully")
        else:
            current_app.logger.info("Duplicate recommendation detected; skipping duplicate history insert")
    except Exception as exc:
        current_app.logger.error(
            "Failed to save crop recommendation: %s\n%s",
            exc,
            traceback.format_exc(),
        )
    finally:
        try:
            conn.close()
        except Exception:
            pass

    response_data = {
        "status": "success",
        "data": {
            "primary_crop": predicted_crop,
            "confidence_score": confidence,
            "crop_recommendation": build_bilingual_response(predicted_crop, confidence, alternatives),
        }
    }
    
    current_app.logger.info("=== SENDING RESPONSE ===")
    current_app.logger.info("Response status: 200")
    current_app.logger.info("Response data: %s", response_data)
    
    return jsonify(response_data)


@crop.route('/api/crop-recommendation/history', methods=['GET'])
def crop_recommendation_history_api():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT soil_type, nitrogen, phosphorus, potassium, ph, temperature, humidity, rainfall, latitude, longitude, recommended_crop, confidence, created_at
            FROM crop_recommendations
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (session["user"]["id"],),
        )
        rows = cursor.fetchall()
        history = [
            {
                "soil_type": row[0] or "",
                "nitrogen": row[1],
                "phosphorus": row[2],
                "potassium": row[3],
                "ph": row[4],
                "temperature": row[5],
                "humidity": row[6],
                "rainfall": row[7],
                "latitude": row[8],
                "longitude": row[9],
                "recommended_crop": row[10],
                "confidence": round(row[11] or 0, 2),
                "created_at": row[12],
            }
            for row in rows
        ]
        return jsonify({"status": "success", "data": {"history": history}})
    except Exception as exc:
        current_app.logger.error(
            "Failed to fetch crop recommendation history: %s\n%s",
            exc,
            traceback.format_exc(),
        )
        return jsonify({"status": "error", "message": "Unable to load history"}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ========================
# LEGACY FORM ROUTE
# ========================
@crop.route('/crop', methods=['POST'])
def add_crop():
    crop_name = request.form.get('crop')
    confidence = request.form.get('confidence')

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO crop_recommendations (user_id, recommended_crop, confidence)
    VALUES (?, ?, ?)
    """, (1, crop_name, confidence))
    conn.commit()
    conn.close()

    return redirect('/dashboard')
