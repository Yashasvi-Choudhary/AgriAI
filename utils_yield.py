import pandas as pd

REQUIRED_FIELDS = [
    "crop",
    "area",
    "rainfall",
    "temperature",
    "soil_type",
    "fertilizer_usage",
    "irrigation"
]

def validate_input(payload):
    if not isinstance(payload, dict):
        return None

    validated = {}
    for field in REQUIRED_FIELDS:
        if field not in payload:
            return None

        value = payload[field]
        if field in ["crop", "soil_type"]:
            if not isinstance(value, str) or not value.strip():
                return None
            validated[field] = value.strip().lower()
            continue

        try:
            number = float(value)
        except (TypeError, ValueError):
            return None

        validated[field] = number

    return validated

def prepare_model_input(validated):
    df = pd.DataFrame([{
        "Crop": validated["crop"],
        "Area_ha": validated["area"],
        "Rainfall_mm": validated["rainfall"],
        "Temperature_C": validated["temperature"],
    }])
    return df

def build_response(prediction):
    yield_value = float(prediction)
    return {
        "status": "success",
        "data": {
            "yield_prediction": {
                "english": {
                    "predicted_yield": f"{yield_value:.2f}",
                    "unit": "kg/hectare",
                    "confidence": "High",
                    "analysis": "Based on the provided environmental factors, the predicted yield is calculated.",
                    "suggestion": "Optimize irrigation and fertilizer use for better results."
                },
                "hindi": {
                    "predicted_yield": f"{yield_value:.2f}",
                    "unit": "किलोग्राम प्रति हेक्टेयर",
                    "confidence": "उच्च",
                    "analysis": "प्रदान किए गए पर्यावरणीय कारकों के आधार पर, अनुमानित उपज की गणना की गई है।",
                    "suggestion": "बेहतर परिणामों के लिए सिंचाई और उर्वरक के उपयोग को अनुकूलित करें।"
                }
            }
        }
    }