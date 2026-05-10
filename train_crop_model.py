import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

# Load dataset
data_path = os.path.join(os.path.dirname(__file__), 'data', 'Crop_recommendation.csv')
df = pd.read_csv(data_path)

# Features and target
features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
X = df[features]
y = df['label']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Save model
model_dir = os.path.join(os.path.dirname(__file__), 'model')
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, 'crop_model.pkl')
joblib.dump(model, model_path)

print(f"Model trained and saved to {model_path}")