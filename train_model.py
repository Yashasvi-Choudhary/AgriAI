import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")
INPUT_PATH = os.path.join(DATA_DIR, "fertilizer-guide.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "fertilizer_model.pkl")
ALTERNATE_PATH = os.path.join(DATA_DIR, "Fertilizer-guide.csv")

if not os.path.exists(INPUT_PATH):
    if os.path.exists(ALTERNATE_PATH):
        raw = pd.read_csv(ALTERNATE_PATH)
        raw.columns = [c.strip().lower().replace(" ", "_") for c in raw.columns]
        raw = raw.rename(columns={
            "temparature": "temperature",
            "humidity": "humidity",
            "moisture": "moisture",
            "soil_type": "soil_type",
            "crop_type": "crop_type",
            "phosphorous": "phosphorus",
            "fertilizer_name": "fertilizer",
        })
        raw = raw[["temperature", "humidity", "moisture", "soil_type", "crop_type", "nitrogen", "phosphorus", "potassium", "fertilizer"]]
        raw.to_csv(INPUT_PATH, index=False)
        print("Created normalized dataset at", INPUT_PATH)
    else:
        raise FileNotFoundError(f"Dataset not found: {INPUT_PATH} or {ALTERNATE_PATH}")

os.makedirs(MODEL_DIR, exist_ok=True)

df = pd.read_csv(INPUT_PATH)
df = df.dropna(subset=["temperature", "humidity", "moisture", "soil_type", "crop_type", "nitrogen", "phosphorus", "potassium", "fertilizer"])
df = df.astype({
    "temperature": float,
    "humidity": float,
    "moisture": float,
    "nitrogen": float,
    "phosphorus": float,
    "potassium": float,
})

df["soil_type"] = df["soil_type"].astype(str).str.strip().str.lower()
df["crop_type"] = df["crop_type"].astype(str).str.strip().str.lower()

grouped = df[["temperature", "humidity", "moisture", "soil_type", "crop_type", "nitrogen", "phosphorus", "potassium"]]
y = df["fertilizer"].astype(str).str.strip()

categorical_features = ["soil_type", "crop_type"]
preprocessor = ColumnTransformer(
    transformers=[
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            categorical_features,
        )
    ],
    remainder="passthrough",
)

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=200, random_state=42)),
    ]
)

pipeline.fit(grouped, y)
joblib.dump(pipeline, MODEL_PATH)
print("Saved trained model to", MODEL_PATH)
