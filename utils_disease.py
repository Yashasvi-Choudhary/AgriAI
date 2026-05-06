"""
Utilities for plant disease detection
Handles: disease name mapping, descriptions, treatments, English/Hindi translations
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────
# DISEASE DATABASE WITH TREATMENTS
# ─────────────────────────────────────────────
DISEASE_DATABASE = {
    # Apple diseases
    "Apple_Apple_scab": {
        "english": {
            "name": "Apple Scab",
            "description": "A fungal disease causing dark spots on leaves and fruits. It thrives in cool, wet conditions and can reduce fruit quality significantly.",
            "treatment": "Use fungicides like sulfur or copper-based sprays. Remove infected leaves regularly. Improve air circulation by pruning. Apply preventive sprays before bloom season."
        },
        "hindi": {
            "name": "सेब का स्कैब",
            "description": "एक कवक रोग जो पत्तियों और फलों पर काले धब्बे का कारण बनता है। यह ठंडी, गीली परिस्थितियों में पनपता है और फल की गुणवत्ता को काफी कम कर सकता है।",
            "treatment": "सल्फर या तांबा-आधारित स्प्रे जैसे कवकनाशी का उपयोग करें। नियमित रूप से संक्रमित पत्तियों को हटाएं। छंटाई के द्वारा हवा का संचार बेहतर बनाएं। खिलने के मौसम से पहले निवारक स्प्रे लगाएं।"
        }
    },
    "Apple_Black_rot": {
        "english": {
            "name": "Black Rot",
            "description": "A serious fungal disease causing large black lesions on fruits, leaves, and twigs. It can cause complete fruit rot if untreated.",
            "treatment": "Prune infected branches immediately. Use fungicide sprays containing sulfur. Maintain good orchard hygiene by removing fallen fruits. Apply copper-based fungicides during growing season."
        },
        "hindi": {
            "name": "काला सड़न",
            "description": "एक गंभीर कवक रोग जो फलों, पत्तियों और शाखाओं पर बड़े काले घाव का कारण बनता है। यदि इलाज न किया जाए तो फल पूरी तरह सड़ सकता है।",
            "treatment": "संक्रमित शाखाओं को तुरंत काटें। सल्फर युक्त कवकनाशी स्प्रे का उपयोग करें। गिरे हुए फलों को हटाकर बाग की स्वच्छता बनाए रखें। बढ़ते मौसम में तांबा-आधारित कवकनाशी लगाएं।"
        }
    },
    "Apple_Cedar_apple_rust": {
        "english": {
            "name": "Cedar Apple Rust",
            "description": "A fungal disease that causes orange-yellow spots on leaves and apple fruits. Requires cedar trees for disease cycle completion.",
            "treatment": "Remove cedar trees nearby if possible. Use fungicide sprays in spring. Apply sulfur-based sprays before and after bloom. Remove infected leaves promptly."
        },
        "hindi": {
            "name": "सीडर सेब जंग",
            "description": "एक कवक रोग जो पत्तियों और सेब के फलों पर नारंगी-पीले धब्बे का कारण बनता है। रोग चक्र पूरा करने के लिए देवदार के पेड़ों की आवश्यकता होती है।",
            "treatment": "यदि संभव हो तो पास के देवदार के पेड़ों को हटाएं। वसंत में कवकनाशी स्प्रे का उपयोग करें। खिलने से पहले और बाद में सल्फर-आधारित स्प्रे लगाएं। संक्रमित पत्तियों को तुरंत हटाएं।"
        }
    },
    "Tomato_Early_blight": {
        "english": {
            "name": "Early Blight",
            "description": "A fungal disease causing brown spots with concentric rings on lower leaves. It can defoliate plants and reduce fruit quality.",
            "treatment": "Remove infected leaves as soon as spotted. Use chlorothalonil or mancozeb fungicides. Improve air circulation. Water at soil level, not foliage. Mulch to prevent soil splash."
        },
        "hindi": {
            "name": "प्रारंभिक झुलसा",
            "description": "एक कवक रोग जो निचली पत्तियों पर संकेंद्रित छल्लों के साथ भूरे धब्बे का कारण बनता है। यह पौधों को पत्तियों से वंचित कर सकता है और फल की गुणवत्ता को कम कर सकता है।",
            "treatment": "संक्रमित पत्तियों को तुरंत हटाएं। क्लोरोथैलोनिल या मैनकोजेब कवकनाशी का उपयोग करें। हवा का संचार बेहतर बनाएं। पत्तियों पर नहीं, मिट्टी के स्तर पर पानी दें। पलवार से मिट्टी के छींटों को रोकें।"
        }
    },
    "Tomato_Late_blight": {
        "english": {
            "name": "Late Blight",
            "description": "A destructive fungal disease causing water-soaked spots on leaves and stems. Can destroy entire plants in cool, wet conditions.",
            "treatment": "Use metalaxyl or fosetyl-aluminum fungicides. Remove infected plant parts immediately. Ensure good air circulation. Avoid overhead watering. Space plants properly."
        },
        "hindi": {
            "name": "देर से झुलसा",
            "description": "एक विनाशकारी कवक रोग जो पत्तियों और तनों पर पानी से भिगोए हुए धब्बे का कारण बनता है। ठंडी, गीली परिस्थितियों में पूरे पौधे को नष्ट कर सकता है।",
            "treatment": "मेटालैक्सिल या फॉसेटाइल-एल्यूमीनियम कवकनाशी का उपयोग करें। संक्रमित पौधे के हिस्सों को तुरंत हटाएं। अच्छा हवा संचार सुनिश्चित करें। ऊपर से पानी न दें। पौधों को सही दूरी पर रखें।"
        }
    },
    "Tomato_Septoria_leaf_spot": {
        "english": {
            "name": "Septoria Leaf Spot",
            "description": "A fungal disease causing small circular spots with dark borders and gray centers on leaves. Affects lower leaves first.",
            "treatment": "Remove infected leaves regularly. Apply chlorothalonil or copper fungicides. Improve air circulation. Avoid wetting foliage. Space plants for better air flow."
        },
        "hindi": {
            "name": "सेप्टोरिया पत्ती धब्बा",
            "description": "एक कवक रोग जो पत्तियों पर गहरी सीमाओं और भूरे केंद्रों के साथ छोटे गोलाकार धब्बे का कारण बनता है। पहले निचली पत्तियों को प्रभावित करता है।",
            "treatment": "नियमित रूप से संक्रमित पत्तियों को हटाएं। क्लोरोथैलोनिल या तांबा कवकनाशी लगाएं। हवा का संचार बेहतर बनाएं। पत्तियों को गीला होने से बचाएं। बेहतर हवा प्रवाह के लिए पौधों को दूर रखें।"
        }
    },
    "Potato_Early_blight": {
        "english": {
            "name": "Early Blight",
            "description": "A fungal disease causing brown spots with concentric rings on leaves. Can lead to severe defoliation and reduced yield.",
            "treatment": "Use mancozeb or chlorothalonil fungicides. Remove infected leaves. Improve air circulation. Water at soil level. Remove lower leaves when plants are large."
        },
        "hindi": {
            "name": "प्रारंभिक झुलसा",
            "description": "एक कवक रोग जो पत्तियों पर संकेंद्रित छल्लों के साथ भूरे धब्बे का कारण बनता है। गंभीर पत्तियों का नुकसान और कम पैदावार का कारण बन सकता है।",
            "treatment": "मैनकोजेब या क्लोरोथैलोनिल कवकनाशी का उपयोग करें। संक्रमित पत्तियों को हटाएं। हवा का संचार बेहतर बनाएं। मिट्टी के स्तर पर पानी दें। पौधों के बड़े होने पर निचली पत्तियों को हटाएं।"
        }
    },
    "Potato_Late_blight": {
        "english": {
            "name": "Late Blight",
            "description": "A severe fungal disease causing water-soaked lesions on leaves and tubers. Can destroy entire potato crop.",
            "treatment": "Use metalaxyl, fosetyl-aluminum or copper fungicides. Remove infected plants. Ensure proper drainage. Space plants for air circulation. Destroy infected tubers."
        },
        "hindi": {
            "name": "देर से झुलसा",
            "description": "एक गंभीर कवक रोग जो पत्तियों और कंदों पर पानी से भिगोए हुए घाव का कारण बनता है। पूरी आलू की फसल को नष्ट कर सकता है।",
            "treatment": "मेटालैक्सिल, फॉसेटाइल-एल्यूमीनियम या तांबा कवकनाशी का उपयोग करें। संक्रमित पौधों को हटाएं। उचित जल निकासी सुनिश्चित करें। हवा के संचार के लिए पौधों को दूर रखें। संक्रमित कंदों को नष्ट करें।"
        }
    },
    "Corn_maize_Northern_Leaf_Blight": {
        "english": {
            "name": "Northern Leaf Blight",
            "description": "A fungal disease causing long, elliptical lesions with gray centers on corn leaves. Can cause significant yield loss.",
            "treatment": "Use triazole fungicides like propiconazole. Plant resistant varieties. Remove infected leaves. Improve drainage and air circulation. Crop rotation is important."
        },
        "hindi": {
            "name": "उत्तरी पत्ती झुलसा",
            "description": "एक कवक रोग जो मकई की पत्तियों पर भूरे केंद्रों के साथ लंबे, दीर्घवृत्ताकार घाव का कारण बनता है। महत्वपूर्ण पैदावार हानि का कारण बन सकता है।",
            "treatment": "प्रोपिकोनाज़ोल जैसे ट्रायजोल कवकनाशी का उपयोग करें। प्रतिरोधी किस्मों को लगाएं। संक्रमित पत्तियों को हटाएं। जल निकासी और हवा संचार में सुधार करें। फसल चक्र महत्वपूर्ण है।"
        }
    },
    "Grape_Black_rot": {
        "english": {
            "name": "Black Rot",
            "description": "A fungal disease causing dark lesions on grape berries, leaves, and canes. Can result in complete crop loss if untreated.",
            "treatment": "Use mancozeb or sulfur fungicides. Remove infected berries and canes. Thin canopy for air flow. Avoid overhead irrigation. Prune for better air circulation."
        },
        "hindi": {
            "name": "काला सड़न",
            "description": "एक कवक रोग जो अंगूर की बेरीज, पत्तियों और बेलों पर गहरे घाव का कारण बनता है। यदि इलाज न किया जाए तो पूरी फसल का नुकसान हो सकता है।",
            "treatment": "मैनकोजेब या सल्फर कवकनाशी का उपयोग करें। संक्रमित बेरीज और बेलों को हटाएं। हवा प्रवाह के लिए पत्तियों को पतला करें। ऊपर से सिंचाई न करें। बेहतर हवा संचार के लिए छंटाई करें।"
        }
    },
    "Peach_Bacterial_spot": {
        "english": {
            "name": "Bacterial Spot",
            "description": "A bacterial disease causing dark, greasy spots on leaves and fruits. Spreads rapidly in wet conditions.",
            "treatment": "Use copper fungicides or antibiotics like streptomycin. Prune infected branches. Improve air circulation. Avoid overhead watering. Remove infected fruits."
        },
        "hindi": {
            "name": "बैक्टीरियल स्पॉट",
            "description": "एक जीवाणु रोग जो पत्तियों और फलों पर गहरे, चिकने धब्बे का कारण बनता है। गीली परिस्थितियों में तेजी से फैलता है।",
            "treatment": "तांबा कवकनाशी या स्ट्रेप्टोमाइसिन जैसी एंटीबायोटिक्स का उपयोग करें। संक्रमित शाखाओं को काटें। हवा का संचार बेहतर बनाएं। ऊपर से पानी न दें। संक्रमित फलों को हटाएं।"
        }
    },
    "Pepper_bell_Bacterial_spot": {
        "english": {
            "name": "Bacterial Spot",
            "description": "A bacterial disease causing brown, greasy spots on leaves, stems, and fruits. Reduces fruit quality significantly.",
            "treatment": "Use copper-based bactericides or antibiotics. Remove infected plant parts. Improve air circulation. Avoid wetting foliage. Sanitize tools between cuts."
        },
        "hindi": {
            "name": "बैक्टीरियल स्पॉट",
            "description": "एक जीवाणु रोग जो पत्तियों, तनों और फलों पर भूरे, चिकने धब्बे का कारण बनता है। फल की गुणवत्ता को काफी कम करता है।",
            "treatment": "तांबा-आधारित कीटाणुनाशक या एंटीबायोटिक्स का उपयोग करें। संक्रमित पौधे के हिस्सों को हटाएं। हवा का संचार बेहतर बनाएं। पत्तियों को गीला होने से बचाएं। कटों के बीच उपकरण कीटाणुरहित करें।"
        }
    },
    "Strawberry_Leaf_scorch": {
        "english": {
            "name": "Leaf Scorch",
            "description": "A fungal disease causing reddish-brown blotches on leaves. Can reduce plant vigor and berry production.",
            "treatment": "Use sulfur or copper fungicides. Remove infected leaves. Improve air circulation. Avoid overhead irrigation. Remove runners and old leaves in dormancy."
        },
        "hindi": {
            "name": "पत्ती स्कॉर्च",
            "description": "एक कवक रोग जो पत्तियों पर लाल-भूरे दाग का कारण बनता है। पौधों की जीवन्तता और बेरी उत्पादन को कम कर सकता है।",
            "treatment": "सल्फर या तांबा कवकनाशी का उपयोग करें। संक्रमित पत्तियों को हटाएं। हवा का संचार बेहतर बनाएं। ऊपर से सिंचाई न करें। निष्क्रियता में धावकों और पुरानी पत्तियों को हटाएं।"
        }
    },
    "Squash_Powdery_mildew": {
        "english": {
            "name": "Powdery Mildew",
            "description": "A fungal disease causing white powder coating on leaves and stems. Reduces photosynthesis and fruit quality.",
            "treatment": "Use sulfur or baking soda sprays. Apply milk spray (1:10 solution). Improve air circulation by pruning. Avoid excessive nitrogen fertilizer. Remove affected leaves."
        },
        "hindi": {
            "name": "पाउडर फफूंदी",
            "description": "एक कवक रोग जो पत्तियों और तनों पर सफेद पाउडर कोटिंग का कारण बनता है। प्रकाश संश्लेषण और फल की गुणवत्ता को कम करता है।",
            "treatment": "सल्फर या बेकिंग सोडा स्प्रे का उपयोग करें। दूध स्प्रे (1:10 घोल) लगाएं। छंटाई के द्वारा हवा का संचार बेहतर बनाएं। अत्यधिक नाइट्रोजन खाद न लगाएं। प्रभावित पत्तियों को हटाएं।"
        }
    },
    "Blueberry_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your blueberry plant appears to be healthy with no visible signs of disease. Maintain regular care and monitoring.",
            "treatment": "Continue regular watering and pruning. Monitor for any new symptoms. Maintain soil pH between 4.5-5.5. Provide good drainage and air circulation."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका ब्लूबेरी पौधा स्वस्थ दिखाई दे रहा है और कोई दृश्यमान रोग का संकेत नहीं है। नियमित देखभाल और निगरानी जारी रखें।",
            "treatment": "नियमित पानी देना और छंटाई जारी रखें। किसी भी नए लक्षण के लिए निगरानी करें। मिट्टी का पीएच 4.5-5.5 के बीच रखें। अच्छी जल निकासी और हवा संचार प्रदान करें।"
        }
    },
    "Raspberry_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your raspberry plant is in good health with no visible disease symptoms. Maintain proper care practices.",
            "treatment": "Continue regular watering and mulching. Remove old canes after fruiting. Provide support structure for new canes. Monitor for pests regularly."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका रास्पबेरी पौधा अच्छे स्वास्थ्य में है और कोई दृश्यमान रोग का संकेत नहीं है। उचित देखभाल प्रथाओं को बनाए रखें।",
            "treatment": "नियमित पानी देना और पलवार जारी रखें। फलने के बाद पुरानी बेलों को हटाएं। नई बेलों के लिए सहायता संरचना प्रदान करें। नियमित रूप से कीटों के लिए निगरानी करें।"
        }
    },
    "Soybean_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your soybean plant shows no visible signs of disease. It appears to be developing normally.",
            "treatment": "Continue with regular irrigation and weeding. Monitor for pests like aphids and beetles. Ensure proper nutrient supply. Watch for any symptom changes."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका सोयाबीन पौधा कोई दृश्यमान रोग का संकेत नहीं दिखाता है। यह सामान्य रूप से विकसित हो रहा है।",
            "treatment": "नियमित सिंचाई और निराई जारी रखें। एफिड्स और बीटल जैसे कीटों के लिए निगरानी करें। उचित पोषक तत्व की आपूर्ति सुनिश्चित करें। किसी भी लक्षण परिवर्तन की निगरानी करें।"
        }
    },
    "Strawberry_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your strawberry plant is healthy with no visible disease symptoms. Keep up with regular maintenance.",
            "treatment": "Continue regular watering and weeding. Remove runners as needed. Maintain soil moisture consistently. Monitor for slugs and other pests."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका स्ट्रॉबेरी पौधा स्वस्थ है और कोई दृश्यमान रोग का संकेत नहीं है। नियमित रखरखाव जारी रखें।",
            "treatment": "नियमित पानी देना और निराई जारी रखें। आवश्यकतानुसार धावकों को हटाएं। मिट्टी की नमी को लगातार बनाए रखें। स्लग और अन्य कीटों के लिए निगरानी करें।"
        }
    },
    "Apple_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your apple tree appears to be healthy with no visible signs of disease. Maintain regular orchard practices.",
            "treatment": "Continue regular pruning and thinning. Monitor for pests and diseases. Maintain good tree structure. Ensure adequate water supply during dry periods."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका सेब का पेड़ स्वस्थ दिखाई दे रहा है और कोई दृश्यमान रोग का संकेत नहीं है। नियमित बाग प्रथाओं को बनाए रखें।",
            "treatment": "नियमित छंटाई और पतलीकरण जारी रखें। कीटों और रोगों के लिए निगरानी करें। अच्छी पेड़ की संरचना बनाए रखें। शुष्क अवधि में पर्याप्त पानी की आपूर्ति सुनिश्चित करें।"
        }
    },
    "Tomato_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your tomato plant is healthy with no visible disease symptoms. Continue proper care and monitoring.",
            "treatment": "Maintain consistent watering at soil level. Provide proper support and pruning. Monitor for pests regularly. Ensure good air circulation around plants."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका टमाटर का पौधा स्वस्थ है और कोई दृश्यमान रोग का संकेत नहीं है। उचित देखभाल और निगरानी जारी रखें।",
            "treatment": "मिट्टी के स्तर पर लगातार पानी देना बनाए रखें। उचित समर्थन और छंटाई प्रदान करें। नियमित रूप से कीटों के लिए निगरानी करें। पौधों के चारों ओर अच्छा हवा संचार सुनिश्चित करें।"
        }
    },
    "Potato_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your potato plant shows no signs of disease and appears to be growing well.",
            "treatment": "Continue regular watering and earthing up. Monitor for pests like beetles and aphids. Maintain weed-free fields. Ensure proper drainage."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका आलू का पौधा कोई रोग का संकेत नहीं दिखाता है और अच्छी तरह बढ़ रहा है।",
            "treatment": "नियमित पानी देना और मिट्टी चढ़ाना जारी रखें। बीटल और एफिड्स जैसे कीटों के लिए निगरानी करें। खरपतवार-मुक्त खेत बनाए रखें। उचित जल निकासी सुनिश्चित करें।"
        }
    },
    "Corn_maize_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your corn plant is healthy with no visible disease symptoms. It is developing normally.",
            "treatment": "Maintain adequate irrigation during critical growth stages. Monitor for pests like corn borers. Ensure proper spacing between plants. Continue regular field maintenance."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका मकई का पौधा स्वस्थ है और कोई दृश्यमान रोग का संकेत नहीं है। यह सामान्य रूप से विकसित हो रहा है।",
            "treatment": "महत्वपूर्ण विकास चरणों में पर्याप्त सिंचाई बनाए रखें। मकई के बोरर जैसे कीटों के लिए निगरानी करें। पौधों के बीच उचित दूरी सुनिश्चित करें। नियमित क्षेत्र रखरखाव जारी रखें।"
        }
    },
    "Grape_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your grape plant is in good health with no visible disease symptoms.",
            "treatment": "Continue regular pruning and training. Monitor for pests like spider mites. Maintain consistent irrigation. Ensure proper canopy management."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका अंगूर का पौधा अच्छे स्वास्थ्य में है और कोई दृश्यमान रोग का संकेत नहीं है।",
            "treatment": "नियमित छंटाई और प्रशिक्षण जारी रखें। लाल मकड़ियों जैसे कीटों के लिए निगरानी करें। लगातार सिंचाई बनाए रखें। उचित पत्तियों का प्रबंधन सुनिश्चित करें।"
        }
    },
    "Peach_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your peach tree appears to be healthy with no visible disease symptoms.",
            "treatment": "Continue regular pruning and thinning fruits. Monitor for pests. Ensure proper water supply. Maintain good tree structure and airflow."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका आड़ू का पेड़ स्वस्थ दिखाई दे रहा है और कोई दृश्यमान रोग का संकेत नहीं है।",
            "treatment": "नियमित छंटाई और फलों को पतला करना जारी रखें। कीटों के लिए निगरानी करें। पर्याप्त पानी की आपूर्ति सुनिश्चित करें। अच्छी पेड़ी संरचना और हवा प्रवाह बनाए रखें।"
        }
    },
    "Pepper_bell_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your pepper plant is healthy with no visible disease symptoms.",
            "treatment": "Continue regular watering and fertilizing. Provide support for growing fruits. Monitor for pests like spider mites. Ensure good air circulation."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका शिमला मिर्च का पौधा स्वस्थ है और कोई दृश्यमान रोग का संकेत नहीं है।",
            "treatment": "नियमित पानी देना और खाद डालना जारी रखें। बढ़ते फलों के लिए समर्थन प्रदान करें। लाल मकड़ियों जैसे कीटों के लिए निगरानी करें। अच्छा हवा संचार सुनिश्चित करें।"
        }
    },
    "Cherry_including_sour_healthy": {
        "english": {
            "name": "Healthy Plant",
            "description": "Your cherry tree is in good health with no visible disease symptoms.",
            "treatment": "Continue regular pruning after harvest. Monitor for pests. Ensure adequate drainage. Maintain proper tree structure and spacing."
        },
        "hindi": {
            "name": "स्वस्थ पौधा",
            "description": "आपका चेरी का पेड़ अच्छे स्वास्थ्य में है और कोई दृश्यमान रोग का संकेत नहीं है।",
            "treatment": "कटाई के बाद नियमित छंटाई जारी रखें। कीटों के लिए निगरानी करें। पर्याप्त जल निकासी सुनिश्चित करें। उचित पेड़ी संरचना और दूरी बनाए रखें।"
        }
    },
    "Cherry_including_sour_Powdery_mildew": {
        "english": {
            "name": "Powdery Mildew",
            "description": "A fungal disease causing white powder coating on cherry leaves and fruits.",
            "treatment": "Apply sulfur or potassium bicarbonate fungicides. Improve air circulation by pruning. Avoid overhead watering. Remove infected leaves regularly."
        },
        "hindi": {
            "name": "पाउडर फफूंदी",
            "description": "एक कवक रोग जो चेरी की पत्तियों और फलों पर सफेद पाउडर कोटिंग का कारण बनता है।",
            "treatment": "सल्फर या पोटेशियम बाइकार्बोनेट कवकनाशी लगाएं। छंटाई के द्वारा हवा का संचार बेहतर बनाएं। ऊपर से पानी न दें। नियमित रूप से संक्रमित पत्तियों को हटाएं।"
        }
    }
}

# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def clean_class_name(folder_name):
    """
    Convert folder name like 'Apple___Apple_scab' to readable format
    """
    if not folder_name:
        return "Unknown"
    
    # Replace underscores with spaces
    name = folder_name.replace('_', ' ')
    
    # Handle triple underscore separator (plant___disease)
    if '   ' in name:
        parts = name.split('   ')
        plant = parts[0].strip()
        disease = parts[1].strip() if len(parts) > 1 else ""
        
        if disease.lower() == 'healthy':
            return f"{plant} (Healthy)"
        return f"{disease} ({plant})" if disease else plant
    
    return name


def get_disease_info(class_name, lang='en'):
    """
    Get disease information in specified language
    Returns: {name, description, treatment}
    """
    # Try direct lookup first
    if class_name in DISEASE_DATABASE:
        info = DISEASE_DATABASE[class_name]
        if lang == 'hi' and 'hindi' in info:
            return info['hindi']
        elif 'english' in info:
            return info['english']
    
    # Fallback: try similar class names
    for db_key in DISEASE_DATABASE.keys():
        if db_key.lower() == class_name.lower():
            info = DISEASE_DATABASE[db_key]
            if lang == 'hi' and 'hindi' in info:
                return info['hindi']
            elif 'english' in info:
                return info['english']
    
    # Default response if not found
    clean_name = clean_class_name(class_name)
    if lang == 'hi':
        return {
            "name": clean_name,
            "description": "पौधे की स्थिति अज्ञात है। कृपया अन्य लक्षणों के लिए निगरानी जारी रखें।",
            "treatment": "विशेषज्ञ सहायता के लिए स्थानीय कृषि अधिकारी से संपर्क करें।"
        }
    else:
        return {
            "name": clean_name,
            "description": "The plant condition is unknown. Please continue monitoring for other symptoms.",
            "treatment": "Contact your local agricultural officer for expert assistance."
        }


def format_confidence(confidence_score):
    """
    Format confidence score as percentage string
    confidence_score: float between 0 and 1
    """
    if isinstance(confidence_score, (int, float)):
        percentage = float(confidence_score) * 100
        return f"{percentage:.1f}%"
    return "0%"


def is_healthy(class_name):
    """
    Check if the detected disease indicates a healthy plant
    """
    healthy_keywords = ['healthy', 'स्वस्थ']
    return any(kw.lower() in class_name.lower() for kw in healthy_keywords)


def prepare_disease_response(class_name, confidence, lang='en'):
    """
    Prepare complete disease detection response
    Returns: {disease_name, confidence, description, treatment}
    """
    disease_info = get_disease_info(class_name, lang)
    
    return {
        "disease_name": disease_info.get('name', 'Unknown'),
        "confidence": format_confidence(confidence),
        "description": disease_info.get('description', ''),
        "treatment": disease_info.get('treatment', '')
    }
