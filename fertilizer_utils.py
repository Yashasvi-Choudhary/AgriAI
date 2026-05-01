import pandas as pd

REQUIRED_FIELDS = [
    "temperature",
    "humidity",
    "moisture",
    "soil_type",
    "crop_type",
    "nitrogen",
    "phosphorus",
    "potassium",
]

FERTILIZER_TRANSLATIONS = {
    "Urea": {"en": "Urea", "hi": "यूरिया"},
    "DAP": {"en": "DAP", "hi": "डीएपी"},
    "Potash": {"en": "Potash", "hi": "पोटाश"},
    "NPK": {"en": "NPK", "hi": "एनपीके"},
    "14-35-14": {"en": "14-35-14", "hi": "14-35-14"},
    "17-17-17": {"en": "17-17-17", "hi": "17-17-17"},
    "20-20": {"en": "20-20", "hi": "20-20"},
    "28-28": {"en": "28-28", "hi": "28-28"},
    "10-26-26": {"en": "10-26-26", "hi": "10-26-26"},
}

FERTILIZER_QUANTITY = {
    "Urea": {"en": "Apply 40–50 kg per acre", "hi": "प्रति एकड़ 40–50 किलोग्राम लगाएं"},
    "DAP": {"en": "Apply 30–40 kg per acre", "hi": "प्रति एकड़ 30–40 किलोग्राम लगाएं"},
    "Potash": {"en": "Apply 25–35 kg per acre", "hi": "प्रति एकड़ 25–35 किलोग्राम लगाएं"},
    "NPK": {"en": "Apply 50 kg per acre", "hi": "प्रति एकड़ 50 किलोग्राम लगाएं"},
}

REASON_TEXT = {
    "Urea": {
        "en": "Soil nitrogen is low, so a nitrogen-rich fertilizer is recommended.",
        "hi": "मिट्टी में नाइट्रोजन कम है, इसलिए नाइट्रोजन समृद्ध उर्वरक सुझावित है।",
    },
    "DAP": {
        "en": "Phosphorus is low, which is important for root and flower growth.",
        "hi": "फॉस्फोरस कम है, जो जड़ और फूल के विकास के लिए महत्वपूर्ण है।",
    },
    "Potash": {
        "en": "Potassium is low, and Potash helps strengthen stems and fruits.",
        "hi": "पोटैशियम कम है, और पोटाश तनों और फलों को मजबूत करता है।",
    },
    "NPK": {
        "en": "Balanced nutrients are needed, so a complete NPK fertilizer is best.",
        "hi": "पोषक तत्व संतुलित करने के लिए पूर्ण NPK उर्वरक सबसे अच्छा है।",
    },
}

ADVICE_TEXT = {
    "Urea": {
        "en": "Use before irrigation and avoid over-application.",
        "hi": "सिंचाई से पहले उपयोग करें और अधिक मात्रा से बचें।",
    },
    "DAP": {
        "en": "Mix into soil before sowing for quicker nutrient uptake.",
        "hi": "बीज बोने से पहले मिट्टी में मिलाएं ताकि पोषक तत्व जल्दी मिलें।",
    },
    "Potash": {
        "en": "Apply during active growth and avoid application before heavy rain.",
        "hi": "सक्रिय विकास के दौरान लगाएं और भारी बारिश से पहले न डालें।",
    },
    "NPK": {
        "en": "Split the dose and combine with organic compost if possible.",
        "hi": "खुराक विभाजित करें और संभव हो तो जैविक खाद के साथ मिलाएं।",
    },
}

DEFAULT_QUANTITY = {"en": "Use one 50 kg bag per acre.", "hi": "प्रति एकड़ एक 50 किलोग्राम बैग उपयोग करें।"}
DEFAULT_REASON = {
    "en": "This fertilizer matches your crop and soil nutrient needs.",
    "hi": "यह उर्वरक आपकी फसल और मिट्टी की पोषक तत्व आवश्यकताओं से मेल खाता है।",
}
DEFAULT_ADVICE = {
    "en": "Apply with care and follow a simple soil test recommendation.",
    "hi": "ध्यान से लगाएं और सरल मिट्टी परीक्षण की सलाह का पालन करें।",
}

LOW_THRESHOLD = 15.0
HIGH_THRESHOLD = 35.0


def validate_input(payload):
    if not isinstance(payload, dict):
        return None

    validated = {}
    for field in REQUIRED_FIELDS:
        if field not in payload:
            return None

        value = payload[field]
        if field in ["soil_type", "crop_type"]:
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
        "temperature": validated["temperature"],
        "humidity": validated["humidity"],
        "moisture": validated["moisture"],
        "soil_type": validated["soil_type"],
        "crop_type": validated["crop_type"],
        "nitrogen": validated["nitrogen"],
        "phosphorus": validated["phosphorus"],
        "potassium": validated["potassium"],
    }])
    return df


def _normalize_fertilizer_name(name):
    key = str(name).strip()
    if not key:
        return "NPK"
    if key.lower() in ["urea"]:
        return "Urea"
    if key.lower() in ["dap", "d-a-p"]:
        return "DAP"
    if key.lower() in ["potash", "k"]:
        return "Potash"
    if key.lower() in ["npk"]:
        return "NPK"
    return key


def _get_rule_based_prediction(payload):
    n = payload["nitrogen"]
    p = payload["phosphorus"]
    k = payload["potassium"]

    low_n = n < LOW_THRESHOLD
    low_p = p < LOW_THRESHOLD
    low_k = k < LOW_THRESHOLD

    if low_n and not low_p and not low_k:
        return "Urea"
    if low_p and not low_n and not low_k:
        return "DAP"
    if low_k and not low_n and not low_p:
        return "Potash"
    if low_n and low_p and low_k:
        return "NPK"
    if not low_n and not low_p and not low_k:
        return "NPK"

    return None


def _get_fertilizer_text(prediction, lang):
    normalized = _normalize_fertilizer_name(prediction)
    return FERTILIZER_TRANSLATIONS.get(normalized, {"en": normalized, "hi": normalized})[lang]


def _get_quantity(prediction, lang):
    normalized = _normalize_fertilizer_name(prediction)
    return FERTILIZER_QUANTITY.get(normalized, DEFAULT_QUANTITY)[lang]


def _get_reason(prediction, lang):
    normalized = _normalize_fertilizer_name(prediction)
    return REASON_TEXT.get(normalized, DEFAULT_REASON)[lang]


def _get_advice(prediction, lang):
    normalized = _normalize_fertilizer_name(prediction)
    return ADVICE_TEXT.get(normalized, DEFAULT_ADVICE)[lang]


def build_response(prediction, payload):
    rule_prediction = _get_rule_based_prediction(payload)
    final_prediction = _normalize_fertilizer_name(rule_prediction or prediction)

    return {
        "status": "success",
        "data": {
            "fertilizer_recommendation": {
                "english": {
                    "fertilizer_name": _get_fertilizer_text(final_prediction, "en"),
                    "recommended_quantity": _get_quantity(final_prediction, "en"),
                    "reason": _get_reason(final_prediction, "en"),
                    "additional_advice": _get_advice(final_prediction, "en"),
                },
                "hindi": {
                    "fertilizer_name": _get_fertilizer_text(final_prediction, "hi"),
                    "recommended_quantity": _get_quantity(final_prediction, "hi"),
                    "reason": _get_reason(final_prediction, "hi"),
                    "additional_advice": _get_advice(final_prediction, "hi"),
                },
            }
        }
    }
