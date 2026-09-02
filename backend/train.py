import os
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier

def train_asl_model():
    print("--- Starting EchoTask ASL Model Training ---")
    
    # Feature size matches the 32x32 RGB frame flattening (32 * 32 * 3 = 3072)
    FEATURE_DIM = 3072
    
    # Sign classes corresponding to your application targets
    classes = ["HELLO", "THANK YOU", "YES", "NO", "PLEASE", "A", "B"]
    
    print("Preparing training dataset...")
    X_train = []
    y_train = []
    
    # Generating robust synthetic feature samples mapped to your sign labels.
    # (You can later replace this loop with code that reads actual images/CSV datasets from your 'data' folder)
    np.random.seed(42)
    for i in range(210):
        # Create randomized feature arrays representing flattened image pixels
        features = np.random.rand(FEATURE_DIM)
        label = classes[i % len(classes)]
        X_train.append(features)
        y_train.append(label)
        
    X_train = np.array(X_train)
    y_train = np.array(y_train)
    
    print(f"Training Random Forest Classifier on {len(X_train)} samples across {len(classes)} classes...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Save the model directly into the project root directory
    model_path = os.path.join(os.path.dirname(__file__), "asl_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)
        
    print(f"Success! Model trained and saved to: {model_path}")

if __name__ == "__main__":
    train_asl_model()