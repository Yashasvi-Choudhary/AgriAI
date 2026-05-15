import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib


def train_model():
    data_path = os.path.join(
        os.path.dirname(__file__),
        "data",
        "Crop_recommendation.csv"
    )

    df = pd.read_csv(data_path)

    # Clean column names
    df.columns = [col.strip() for col in df.columns]

    # Rename NPK columns
    df.rename(columns={
        "N": "nitrogen",
        "P": "phosphorus",
        "K": "potassium"
    }, inplace=True)

    # Convert all columns to lowercase
    df.columns = [col.strip().lower() for col in df.columns]

    print("FINAL DATASET COLUMNS:")
    print(df.columns.tolist())

    required_features = [
        "nitrogen",
        "phosphorus",
        "potassium",
        "temperature",
        "humidity",
        "ph",
        "rainfall",
    ]

    label_column = "label"

    if label_column not in df.columns:
        label_candidates = [
            col for col in df.columns
            if col not in required_features
        ]

        if not label_candidates:
            raise ValueError("Label column not found in dataset.")

        label_column = label_candidates[0]

    # Remove missing values
    df = df.dropna(subset=required_features + [label_column])

    # Keep only required columns
    df = df[required_features + [label_column]]

    # Features and labels
    X = pd.DataFrame(
        df[required_features],
        columns=required_features
    )

    y = df[label_column].astype(str).str.strip()

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # Improved pipeline model
    model = Pipeline([
        ("scaler", StandardScaler()),

        ("classifier", RandomForestClassifier(
            n_estimators=500,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced"
        ))
    ])

    # Train model
    model.fit(X_train, y_train)

    # Accuracy
    train_score = model.score(X_train, y_train)
    validation_score = model.score(X_test, y_test)

    # Save model
    model_dir = os.path.join(
        os.path.dirname(__file__),
        "model"
    )

    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(
        model_dir,
        "crop_model.pkl"
    )

    joblib.dump(model, model_path)

    print(f"\nModel saved to: {model_path}")
    print(f"Training Accuracy: {round(train_score * 100, 2)}%")
    print(f"Validation Accuracy: {round(validation_score * 100, 2)}%")

    return model_path


if __name__ == "__main__":
    train_model()