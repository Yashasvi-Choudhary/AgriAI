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