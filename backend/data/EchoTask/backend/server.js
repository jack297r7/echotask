import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import Groq from "groq-sdk";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "EchoTask backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    groqKeyLoaded: Boolean(process.env.GROQ_API_KEY)
  });
});

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (req, res) => {
    let uploadedFile = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No audio file uploaded"
        });
      }

      uploadedFile = req.file.path;

      console.log("Received file:", req.file.originalname);
      console.log("Saved path:", req.file.path);
      console.log("File size:", req.file.size);
      console.log("MIME type:", req.file.mimetype);

      const transcription =
        await groq.audio.transcriptions.create({
          file: fs.createReadStream(req.file.path),
          model: "whisper-large-v3",
          response_format: "verbose_json",
          temperature: 0,
          timestamp_granularities: ["segment"]
        });

      console.log("Transcription completed!");

      res.json({
        fullText: transcription.text,
        segments: transcription.segments || []
      });
    } catch (error) {
      console.error("Transcription error:", error);

      res.status(500).json({
        error: "Transcription failed",
        details: error.message
      });
    } finally {
      if (uploadedFile) {
        fs.unlink(uploadedFile, (err) => {
          if (err) {
            console.error(
              "Could not delete temporary file:",
              err.message
            );
          } else {
            console.log("Temporary audio file deleted.");
          }
        });
      }
    }
  }
);
app.post("/api/extract-tasks", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        error: "Transcript is required"
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You extract actionable tasks from meeting transcripts. Return only valid JSON."
        },
        {
          role: "user",
          content: `Extract all actionable tasks from this transcript.

Return exactly this JSON structure:
{
  "tasks": [
    {
      "owner": "person responsible",
      "task": "action to complete",
      "deadline": "deadline or null"
    }
  ]
}

Transcript:
${transcript}`
        }
      ]
    });

    const result = completion.choices[0].message.content;

    let tasks;

    try {
      tasks = JSON.parse(result);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        rawResponse: result
      });
    }

    res.json(tasks);
  } catch (error) {
    console.error("Task extraction error:", error);

    res.status(500).json({
      error: "Task extraction failed",
      details: error.message
    });
  }
});
app.post("/api/process-audio", upload.single("audio"), async (req, res) => {
  let uploadedFile = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No audio file uploaded"
      });
    }

    uploadedFile = req.file.path;

    console.log("Processing file:", req.file.originalname);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      temperature: 0,
      timestamp_granularities: ["segment"]
    });

    const transcript = transcription.text;

    console.log("Transcription completed!");

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are an intelligent meeting assistant. Extract only genuine actionable tasks from the transcript. Understand English, Tamil-English code-switching, Telugu-English code-switching, and natural conversational language. Do not invent missing information. Return only valid JSON."
        },
        {
          role: "user",
          content: `Analyze this meeting transcript and extract every genuine actionable task.

For each task identify:
- owner: person responsible, or "Unassigned" if unknown
- task: clear action that needs to be completed
- deadline: stated deadline, or null if none
- priority: "High", "Medium", or "Low"
- status: "Pending"
- confidence: number from 0 to 1 representing how confident you are that this is a genuine actionable task

Rules:
- Do not create tasks from general discussion.
- Do not invent owners.
- Do not invent deadlines.
- Preserve the meaning of code-switched speech.
- Convert informal task statements into clear task descriptions.
- If multiple people are assigned different tasks, create separate tasks.
- Return an empty tasks array if there are no actionable tasks.

Return exactly this JSON structure:

{
  "tasks": [
    {
      "owner": "person responsible",
      "task": "action to complete",
      "deadline": "deadline or null",
      "priority": "High",
      "status": "Pending",
      "confidence": 0.95
    }
  ]
}

Transcript:
${transcript}`
        }
      ]
    });

    const result = completion.choices[0].message.content;

    let taskData;

    try {
      taskData = JSON.parse(result);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        rawResponse: result,
        transcript,
        segments: transcription.segments || []
      });
    }

    console.log("Task extraction completed!");

    res.json({
      transcript,
      segments: transcription.segments || [],
      tasks: taskData.tasks || []
    });

  } catch (error) {
    console.error("Audio processing error:", error);

    res.status(500).json({
      error: "Audio processing failed",
      details: error.message
    });

  } finally {
    if (uploadedFile) {
      fs.unlink(uploadedFile, (err) => {
        if (err) {
          console.error("Could not delete temporary file:", err.message);
        } else {
          console.log("Temporary audio file deleted.");
        }
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(
    `EchoTask backend running on http://localhost:${PORT}`
  );
});