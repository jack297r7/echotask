import os
import pickle
import numpy as np
import whisper
import ffmpeg
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="EchoTask ML Server")

# Enable CORS for React Frontend (running on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "asl_model.pkl"
asl_model = None

# Load trained Random Forest model
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "rb") as f:
        asl_model = pickle.load(f)
    print("ASL Model loaded successfully.")

# Load Whisper and HuggingFace Summarizer models
print("Loading Whisper & HuggingFace pipelines...")
whisper_model = whisper.load_model("base")
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

class GestureRequest(BaseModel):
    landmarks: list[float]  # Expects 63 floats (21 hand points * 3D coordinates)

@app.post("/api/predict-gesture")
def predict_gesture(data: GestureRequest):
    if not asl_model:
        raise HTTPException(status_code=500, detail="ASL Model is not loaded. Train train.py first.")
    
    if len(data.landmarks) != 63:
        raise HTTPException(status_code=400, detail="Invalid landmark format. Expected 63 floats.")

    features = np.array(data.landmarks).reshape(1, -1)
    prediction = asl_model.predict(features)[0]
    return {"gesture": str(prediction)}

@app.post("/api/summarize-video")
async def summarize_video(file: UploadFile = File(...)):
    temp_video = f"temp_{file.filename}"
    temp_audio = "temp_audio.wav"

    try:
        # Save video buffer
        with open(temp_video, "wb") as buffer:
            buffer.write(await file.read())

        # Extract audio using ffmpeg
        ffmpeg.input(temp_video).output(temp_audio, ac=1, ar="16000").overwrite_output().run(quiet=True)

        # Transcribe audio using Whisper
        transcription = whisper_model.transcribe(temp_audio)
        raw_text = transcription.get("text", "").strip()

        if not raw_text:
            return {"transcript": "", "summary": "No clear speech detected."}

        # Summarize transcribed notes using DistilBART
        summary = summarizer(raw_text, max_length=150, min_length=30, do_sample=False)
        summarized_text = summary[0]["summary_text"]

        return {"transcript": raw_text, "summary": summarized_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary media files
        for temp_file in [temp_video, temp_audio]:
            if os.path.exists(temp_file):
                os.remove(temp_file)