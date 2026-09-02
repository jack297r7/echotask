import os
import cv2
import pickle
import numpy as np
from skimage.feature import hog
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Path relative to D:\echotask\backend
DATASET_DIR = os.path.join("data", "asl_dataset", "asl_alphabet_train", "asl_alphabet_train")
MODEL_PATH = "asl_model.pkl"

X, y = [], []

if not os.path.exists(DATASET_DIR):
    print(f"Error: Directory '{DATASET_DIR}' not found. Verify you are inside 'D:\\echotask\\backend'.")
    exit(1)

print(f"Extracting HOG features from dataset at: {DATASET_DIR}")

for label in os.listdir(DATASET_DIR):
    class_folder = os.path.join(DATASET_DIR, label)
    if not os.path.isdir(class_folder):
        continue
    
    print(f"Processing gesture class: {label}")
    # Process 150 images per class for optimal training speed
    images = os.listdir(class_folder)[:150]
    
    for img_name in images:
        img_path = os.path.join(class_folder, img_name)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
            
        # Resize image for consistent feature vector size
        img_resized = cv2.resize(img, (64, 64))
        
        # Extract HOG features (captures hand shapes and finger edges)
        features = hog(
            img_resized,
            orientations=9,
            pixels_per_cell=(8, 8),
            cells_per_block=(2, 2),
            block_norm='L2-Hys'
        )
        
        X.append(features)
        y.append(label)

if X:
    X_train, X_test, y_train, y_test = train_test_split(
        np.array(X), np.array(y), test_size=0.2, random_state=42
    )
    
    print("\nTraining Random Forest model on HOG features...")
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"\nSUCCESS! Model Accuracy: {acc * 100:.2f}%")
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    print(f"Model saved successfully to '{MODEL_PATH}' inside backend.")
else:
    print("No valid images found in dataset path.")