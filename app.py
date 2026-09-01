import os
import pickle
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Updated path pointing directly into the 'backend' folder
model_path = os.path.join(BASE_DIR, "backend", "asl_model.pkl")

print(f"DEBUG: Looking for model at -> {model_path}")

model = None
if os.path.exists(model_path):
    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        print("--> Real ASL Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print("--> Warning: Model file not found.")

class FeatureRequest(BaseModel):
    features: list[float]

@app.post("/api/predict-gesture")
async def predict_gesture(data: FeatureRequest):
    if model is None:
        return {"gesture": "ERROR: Model not loaded"}
    
    try:
        input_data = np.array(data.features).reshape(1, -1)
        prediction = model.predict(input_data)
        return {"gesture": str(prediction[0])}
    except Exception as e:
        return {"gesture": f"Prediction Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)