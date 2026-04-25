from flask import Blueprint, request, jsonify, session, render_template, redirect

fertilizer_bp = Blueprint('fertilizer', __name__)


@fertilizer_bp.route('/fertilizer-guide')
def fertilizer_guide():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard/fertilizer-guide.html')


@fertilizer_bp.route('/fertilizer/predict', methods=['POST'])
def fertilizer_predict():
    data = request.get_json()

    nitrogen   = float(data.get('nitrogen')   or 0)
    phosphorus = float(data.get('phosphorus') or 0)
    potassium  = float(data.get('potassium')  or 0)

    def level(v, lo=30, hi=60):
        return "low" if v <= lo else ("high" if v >= hi else "medium")

    return jsonify({
        "success": True,
        "analysis": {
            "nitrogen":   level(nitrogen),
            "phosphorus": level(phosphorus),
            "potassium":  level(potassium)
        },
        "recommendations": [
            {
                "name": "Urea",
                "composition": "46% N",
                "quantity": "50 kg/acre",
                "usage": "Apply in 2 equal splits — at sowing and 30 days after"
            },
            {
                "name": "DAP (Di-Ammonium Phosphate)",
                "composition": "18% N, 46% P₂O₅",
                "quantity": "25 kg/acre",
                "usage": "Apply at sowing as basal dose"
            }
        ]
    })