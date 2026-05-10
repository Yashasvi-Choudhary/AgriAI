# Crop recommendation routes
import os
import sqlite3
import traceback
from flask import Blueprint, request, jsonify, current_app, session, redirect

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'crop_model.pkl')
DB_PATH = os.path.join(BASE_DIR, 'database.db')
_crop_model = None

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


def load_crop_model():
    global _crop_model
    if _crop_model is not None:
        return _crop_model

    if not os.path.isfile(MODEL_PATH):
        current_app.logger.error("Crop model file missing at path: %s", MODEL_PATH)
        _crop_model = None
        return None

    try:
        import joblib

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
            "alternatives": alternatives,
            "analysis": f"{crop_name} is predicted as the best crop for your soil and climate conditions with {confidence}% confidence.",
        },
        "hindi": {
            "recommended_crop": crop_name,
            "confidence": f"{confidence}%",
            "alternatives": alternatives,
            "analysis": f"आपकी मिट्टी और जलवायु परिस्थितियों के अनुसार {crop_name} को {confidence}% विश्वसनीयता के साथ सर्वश्रेष्ठ फसल बताया गया है।",
        },
    }


@crop.route('/api/crop-recommendation', methods=['POST'])
def crop_recommendation_api():
    if "user" not in session:
        return jsonify({"status": "error", "message": "Not logged in"}), 401

    data = request.get_json(silent=True)
    if not data:
        current_app.logger.warning("Invalid JSON payload received for crop recommendation")
        return jsonify({"status": "error", "message": "Invalid JSON payload", "errors": {"payload": "Invalid JSON"}}), 400

    errors = {}
    nitrogen = parse_numeric_field(data, "nitrogen", errors)
    phosphorus = parse_numeric_field(data, "phosphorus", errors)
    potassium = parse_numeric_field(data, "potassium", errors)
    temperature = parse_numeric_field(data, "temperature", errors)
    humidity = parse_numeric_field(data, "humidity", errors)
    ph = parse_numeric_field(data, "ph", errors)
    rainfall = parse_numeric_field(data, "rainfall", errors)

    if errors:
        current_app.logger.warning("Crop recommendation validation failed: %s", errors)
        return jsonify({"status": "error", "message": "Validation failed", "errors": errors}), 400

    crop_model = load_crop_model()
    if crop_model is None:
        return jsonify({
            "status": "error",
            "message": "Model not available",
            "details": {"model_path": MODEL_PATH},
        }), 500

    features = [[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]]
    try:
        prediction = crop_model.predict(features)
        predicted_crop = str(prediction[0])
        confidence = 0.0
        alternatives = []

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
            INSERT INTO crop_recommendations
            (user_id, soil_type, nitrogen, phosphorus, potassium, ph, temperature, humidity, rainfall, latitude, longitude, recommended_crop, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["user"]["id"],
                data.get("soil_type", ""),
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

    return jsonify({
        "status": "success",
        "data": {
            "crop_recommendation": build_bilingual_response(predicted_crop, confidence, alternatives)
        }
    })


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
