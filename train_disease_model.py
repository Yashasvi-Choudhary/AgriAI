"""
Train a CNN model for plant disease detection using transfer learning
Uses MobileNetV2 + custom top layers
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.optimizers import Adam
import warnings

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(BASE_DIR, "data", "disease_detection", "train")
VALID_DIR = os.path.join(BASE_DIR, "data", "disease_detection", "valid")
MODEL_PATH = os.path.join(BASE_DIR, "model", "disease_model.h5")

IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 15

# ─────────────────────────────────────────────
# CREATE MODEL DIRECTORY
# ─────────────────────────────────────────────
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

# ─────────────────────────────────────────────
# LOAD PRE-TRAINED MODEL (MOBILENETV2)
# ─────────────────────────────────────────────
print("Loading MobileNetV2 base model...")
base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights="imagenet"
)

# Freeze base model layers
base_model.trainable = False

# ─────────────────────────────────────────────
# BUILD CUSTOM MODEL
# ─────────────────────────────────────────────
print("Building model architecture...")
model = keras.Sequential([
    layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3)),
    
    # Preprocessing layers
    layers.Rescaling(1./127.5, offset=-1),
    
    # Base model
    base_model,
    
    # Custom top
    layers.GlobalAveragePooling2D(),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(1, activation='sigmoid')  # Will be adjusted based on class count
])

# ─────────────────────────────────────────────
# DATA GENERATORS
# ─────────────────────────────────────────────
print("Preparing data generators...")

train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

valid_datagen = ImageDataGenerator(rescale=1./255)

# Load training data
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical'
)

# Load validation data
valid_generator = valid_datagen.flow_from_directory(
    VALID_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical'
)

# Validate that validation contains the same classes as training
train_classes = set(train_generator.class_indices.keys())
valid_classes = set(valid_generator.class_indices.keys())

if valid_generator.num_classes != train_generator.num_classes or train_classes != valid_classes:
    print("Validation directory does not contain the same classes as training data.")
    print("Falling back to 20% validation split from training data.")

    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=0.2
    )

    valid_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2
    )

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True
    )

    valid_generator = valid_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )

num_classes = train_generator.num_classes
print(f"Number of disease classes: {num_classes}")
print(f"Classes: {train_generator.class_indices}")

# ─────────────────────────────────────────────
# REBUILD MODEL WITH CORRECT OUTPUT LAYER
# ─────────────────────────────────────────────
model = keras.Sequential([
    layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3)),
    layers.Rescaling(1./127.5, offset=-1),
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(num_classes, activation='softmax')
])

# ─────────────────────────────────────────────
# COMPILE MODEL
# ─────────────────────────────────────────────
print("Compiling model...")
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# ─────────────────────────────────────────────
# TRAIN MODEL
# ─────────────────────────────────────────────
print("Training model...")
print(f"Training samples: {train_generator.samples}")
print(f"Validation samples: {valid_generator.samples}")

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=valid_generator,
    steps_per_epoch=len(train_generator),
    validation_steps=len(valid_generator),
    verbose=1
)

# ─────────────────────────────────────────────
# SAVE MODEL
# ─────────────────────────────────────────────
print(f"Saving model to {MODEL_PATH}...")
model.save(MODEL_PATH)

# Save class indices for later use
import json
class_indices = train_generator.class_indices
class_indices_path = os.path.join(BASE_DIR, "model", "disease_classes.json")
with open(class_indices_path, 'w') as f:
    json.dump(class_indices, f)

print("✅ Model training complete!")
print(f"✅ Model saved to: {MODEL_PATH}")
print(f"✅ Class indices saved to: {class_indices_path}")
