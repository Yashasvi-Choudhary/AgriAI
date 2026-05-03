import os
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")
INPUT_PATH = os.path.join(DATA_DIR, "yield_data.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "yield_model.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

df = pd.read_csv(INPUT_PATH)

# Remove Total_ columns
df = df.drop(columns=['Total_N_kg', 'Total_P_kg', 'Total_K_kg'], errors='ignore')

# Select features
features = ['Crop', 'Area_ha', 'Rainfall_mm', 'Temperature_C', 'Humidity_%', 'pH', 'N_req_kg_per_ha', 'P_req_kg_per_ha', 'K_req_kg_per_ha']
target = 'Yield_kg_per_ha'

df = df[features + [target]].dropna()

# Preprocessing
preprocessor = ColumnTransformer(
    transformers=[
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['Crop'])
    ],
    remainder='passthrough'
)

# Pipeline
pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(random_state=42))
])

X = df[features]
y = df[target]

pipeline.fit(X, y)

joblib.dump(pipeline, MODEL_PATH)

print("Yield model trained and saved.")