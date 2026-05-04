import pandas as pd
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load dataset
df = pd.read_csv('data/Crop_recommendation.csv')

print("✅ Dataset loaded")

# Rename columns (IMPORTANT for consistency with backend)
df.rename(columns={
    'N': 'nitrogen',
    'P': 'phosphorus',
    'K': 'potassium',
    'label': 'crop'
}, inplace=True)

# Check missing values
print("\nMissing values:\n", df.isnull().sum())

# Drop missing (if any)
df = df.dropna()

# Features & target
X = df[['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']]
y = df['crop']

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print("✅ Model trained")

# Accuracy
accuracy = model.score(X_test, y_test)
print(f"📊 Accuracy: {round(accuracy * 100, 2)}%")

# Save model
with open('models/crop_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print(" Model saved at models/crop_model.pkl")