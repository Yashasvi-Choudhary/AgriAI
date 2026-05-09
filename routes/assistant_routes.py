from flask import Blueprint, request, jsonify, session, render_template, redirect
import json
import os
import random
from database import connect_db

assistant_bp = Blueprint('assistant', __name__)

# Set your OpenAI API key
# openai.api_key = os.getenv('OPENAI_API_KEY', 'your-openai-api-key-here')

def get_ai_response(user_query, language='en'):
    """Generate mock AI response for farming queries"""
    english_responses = {
        'crop': [
            "For crop selection, consider your soil type, climate, and water availability. Rice grows well in wet conditions, while wheat prefers drier soil. What type of soil do you have?",
            "Different crops have different requirements. Rice needs plenty of water, maize is drought-tolerant, and cotton requires well-drained soil. Tell me more about your farming conditions.",
            "Crop rotation is important for soil health. Try alternating between legumes and cereals to maintain soil fertility and reduce pest problems."
        ],
        'fertilizer': [
            "Use NPK fertilizers based on soil test results. Nitrogen promotes leaf growth, phosphorus helps root development, and potassium strengthens plant immunity. Get your soil tested first.",
            "Organic fertilizers like compost and manure release nutrients slowly and improve soil structure. Chemical fertilizers work faster but can harm beneficial soil microbes if overused.",
            "For rice, apply nitrogen in split doses - 50% at planting, 25% at tillering, and 25% at panicle initiation. Always follow recommended doses to avoid environmental damage."
        ],
        'disease': [
            "Common crop diseases include fungal infections like rust and blight. Proper spacing, crop rotation, and fungicide application can prevent most diseases. Can you describe the symptoms you're seeing?",
            "Early detection is key. Look for yellowing leaves, spots, or wilting. Remove infected plants immediately and apply appropriate fungicides. Keep your field clean and practice proper irrigation.",
            "Bacterial diseases spread through water. Avoid overhead irrigation and ensure good drainage. Copper-based fungicides work well against many bacterial infections."
        ],
        'irrigation': [
            "Drip irrigation is most efficient, delivering water directly to plant roots and reducing evaporation. It can save up to 50% water compared to traditional methods.",
            "Check soil moisture regularly. Rice needs standing water, but most crops prefer moist soil that drains well. Overwatering can lead to root rot and nutrient leaching.",
            "Install rain gauges and weather monitoring systems. Irrigate early morning or evening to minimize evaporation. Mulching helps retain soil moisture."
        ],
        'weather': [
            "Weather affects crop growth significantly. Monitor temperature, rainfall, and humidity. Extreme weather can cause heat stress, frost damage, or delayed maturity.",
            "Climate change is bringing unpredictable weather. Consider drought-resistant varieties and have contingency plans for extreme weather events.",
            "Use weather apps and local meteorological services for accurate forecasts. This helps in timing planting, irrigation, and harvesting operations."
        ],
        'schemes': [
            "Several government schemes support farmers: PM-KISAN provides income support, Pradhan Mantri Fasal Bima Yojana offers crop insurance, and KCC provides credit facilities.",
            "Check eligibility for schemes like Soil Health Card, Paramparagat Krishi Vikas Yojana for organic farming, and National Agriculture Market for better prices.",
            "Visit your local agriculture office or check the government website for current schemes. Many provide subsidies for seeds, fertilizers, and equipment."
        ]
    }

    hindi_responses = {
        'crop': [
            "फसल चयन के लिए अपनी मिट्टी के प्रकार, जलवायु और पानी की उपलब्धता को ध्यान में रखें। धान नम परिस्थितियों में अच्छी तरह बढ़ता है, जबकि गेहूं को सूखी मिट्टी पसंद होती है। आपकी मिट्टी कैसी है?",
            "विभिन्न फसलों की आवश्यकताएं अलग-अलग होती हैं। धान को पानी की अधिकता चाहिए, मक्का सुखाड़ सहिष्णु है, और कपास को अच्छी जल निकासी वाली मिट्टी चाहिए। अपनी खेती की परिस्थितियों के बारे में बताएं।",
            "मृदा स्वास्थ्य के लिए फसल चक्रण महत्वपूर्ण है। लाभकारी फसलों और अन्न फसलों को बदल-बदल कर उगाने का प्रयास करें।"
        ],
        'fertilizer': [
            "मृदा परीक्षण के आधार पर NPK उर्वरकों का उपयोग करें। नाइट्रोजन पत्तियों की वृद्धि को बढ़ाता है, फॉस्फोरस जड़ विकास में मदद करता है, और पोटेशियम पौधे की रोग प्रतिरोधक क्षमता बढ़ाता है। पहले मृदा का परीक्षण कराएं।",
            "जैविक उर्वरक जैसे कंपोस्ट और गोबर धीरे-धीरे पोषक तत्व छोड़ते हैं और मृदा संरचना में सुधार करते हैं। रासायनिक उर्वरक तेज़ काम करते हैं, लेकिन अधिक उपयोग से लाभकारी मिट्टी के जीवों को नुकसान हो सकता है।",
            "धान के लिए नाइट्रोजन को विभाजित मात्रा में लगाएं - 50% रोपाई के समय, 25% तना विकास पर, और 25% माला शुरुआत पर। सिफारिश की गई मात्रा का पालन करें।"
        ],
        'disease': [
            "सामान्य फसल रोगों में ताभी और ब्लाइट शामिल हैं। उचित दूरी, फसल चक्रण, और कवकनाशकों का उपयोग अधिकांश रोगों को रोक सकता है। क्या आप लक्षण बताना चाहेंगे?",
            "आरम्भिक पहचान महत्वपूर्ण है। पत्तियों का पीला होना, धब्बे, या मुरझाना देखें। संक्रमित पौधों को तुरंत हटाएं और उपयुक्त उपचार लागू करें।",
            "बैक्टीरियल रोग पानी के माध्यम से फैलते हैं। ऊपरी सिंचाई से बचें और अच्छी जल निकासी सुनिश्चित करें। तांबे आधारित दवाइयाँ कई रोगों के खिलाफ प्रभावी होती हैं।"
        ],
        'irrigation': [
            "ड्रिप सिंचाई सबसे प्रभावी होती है, जो सीधे जड़ों तक पानी पहुंचाती है और वाष्पीकरण को कम करती है। यह पारंपरिक तरीकों की तुलना में लगभग 50% पानी बचा सकती है।",
            "मृदा नमी नियमित रूप से जांचें। धान को पानी की आवश्यकता होती है, लेकिन अधिकांश फसलें नमी वाली मिट्टी पसंद करती हैं जो अच्छी तरह से बहती हो। अधिक पानी का उपयोग जड़ सड़न कर सकता है।",
            "बारिश का माप और मौसम निगरानी प्रणाली लगाएं। सुबह या शाम को सिंचाई करें ताकि वाष्पीकरण कम हो। मल्चिंग मृदा की नमी बनाए रखती है।"
        ],
        'weather': [
            "मौसम फसल की वृद्धि को बहुत प्रभावित करता है। तापमान, वर्षा, और आर्द्रता की निगरानी करें। अत्यधिक मौसम से गर्मी या ठंड के नुकसान हो सकते हैं।",
            "जलवायु परिवर्तन से मौसम अस्थिर होता जा रहा है। सूखा-रोधी किस्मों पर विचार करें और तीव्र मौसम के लिए योजना रखें।",
            "सटीक पूर्वानुमान के लिए मौसम ऐप और स्थानीय मौसम सेवा का उपयोग करें। यह रोपाई, सिंचाई और कटाई के समय को बेहतर बनाता है।"
        ],
        'schemes': [
            "कई सरकारी योजनाएं किसानों का समर्थन करती हैं: PM-KISAN आय सहायता, प्रधानमंत्री फसल बीमा योजना बीमा, और KCC ऋण सुविधा प्रदान करता है।",
            "मिट्टी स्वास्थ्य कार्ड, परंपरागत कृषि विकास योजना, और राष्ट्रीय कृषि बाजार जैसी योजनाओं के लिए पात्रता जांचें।",
            "अपने स्थानीय कृषि कार्यालय या सरकारी वेबसाइट पर नवीनतम योजनाओं की जानकारी लें। कई बीज, उर्वरक और उपकरणों पर सब्सिडी देती हैं।"
        ]
    }

    default_responses = {
        'en': [
            "I'm here to help with your farming questions. I can assist with crop selection, fertilizers, disease management, irrigation, weather impact, and government schemes. What specific topic would you like to know about?",
            "As an agricultural assistant, I can provide guidance on various farming practices. Please ask me about crops, soil management, pest control, or market information.",
            "Farming involves many aspects from seed selection to harvest. I can help you with crop recommendations, fertilizer application, disease identification, and best practices. What are you working on?"
        ],
        'hi': [
            "मैं आपकी कृषि से संबंधित प्रश्नों में मदद करने के लिए यहां हूं। मैं फसल चयन, उर्वरक, रोग प्रबंधन, सिंचाई, मौसम प्रभाव और सरकारी योजनाओं में मार्गदर्शन कर सकता हूं। आप किस विषय के बारे में जानना चाहेंगे?",
            "एक कृषि सहायक के रूप में, मैं आपको विभिन्न खेती के तरीकों पर सलाह दे सकता हूं। कृपया मुझसे फसलों, मिट्टी प्रबंधन, कीट नियंत्रण या बाजार जानकारी के बारे में पूछें।",
            "खेत की बुवाई से लेकर कटाई तक कई पहलू हैं। मैं आपको फसल अनुशंसाओं, उर्वरक आवेदन, रोग पहचान और सर्वोत्तम प्रथाओं में मदद कर सकता हूं।"
        ]
    }

    query_lower = user_query.lower()
    if language == 'hi':
        responses = hindi_responses
    else:
        responses = english_responses

    for keyword, response_list in responses.items():
        if keyword in query_lower:
            response = random.choice(response_list)
            break
    else:
        response = random.choice(default_responses.get(language, default_responses['en']))

    return response

@assistant_bp.route('/')
def assistant_page():
    """Render the AI Assistant page"""
    if 'user' not in session:
        return redirect('/login')

    return render_template('dashboard/assistant.html')

@assistant_bp.route('/api/assistant/chat', methods=['POST'])
def chat():
    """Handle chat messages"""
    if 'user' not in session:
        return jsonify({'error': 'Please log in to use the AI Assistant'}), 401

    data = request.get_json()
    user_query = data.get('message', '').strip()
    language = data.get('language', 'en')

    if not user_query:
        return jsonify({'error': 'Please provide a message'}), 400

    # Get AI response
    ai_response = get_ai_response(user_query, language)

    # Save to database
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO ai_chat_history (user_id, user_query, ai_response, language)
        VALUES (?, ?, ?, ?)
    """, (session['user']['id'], user_query, ai_response, language))

    conn.commit()
    conn.close()

    return jsonify({
        'response': ai_response,
        'timestamp': 'now'  # You can format this better
    })

@assistant_bp.route('/api/assistant/history', methods=['GET'])
def get_chat_history():
    """Get user's chat history"""
    if 'user' not in session:
        return jsonify({'error': 'Please log in'}), 401

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT rowid, user_query, ai_response, language, created_at
        FROM ai_chat_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    """, (session['user']['id'],))

    history = cursor.fetchall()
    conn.close()

    # Format for frontend
    formatted_history = []
    for row in history:
        formatted_history.append({
            'id': row[0],
            'user_query': row[1],
            'ai_response': row[2],
            'language': row[3],
            'timestamp': row[4]
        })

    return jsonify({'history': formatted_history})

@assistant_bp.route('/api/assistant/history/<int:history_id>', methods=['DELETE'])
def delete_history_item(history_id):
    """Delete a single history entry."""
    if 'user' not in session:
        return jsonify({'error': 'Please log in'}), 401

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM ai_chat_history WHERE rowid = ? AND user_id = ?",
        (history_id, session['user']['id'])
    )
    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        return jsonify({'error': 'History item not found'}), 404

    return jsonify({'success': True})

@assistant_bp.route('/api/assistant/clear_history', methods=['POST'])
def clear_history():
    """Clear user's chat history"""
    if 'user' not in session:
        return jsonify({'error': 'Please log in'}), 401

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM ai_chat_history WHERE user_id = ?", (session['user']['id'],))
    conn.commit()
    conn.close()

    return jsonify({'success': True})