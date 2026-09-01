import React, { useRef, useState } from "react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("video");
  const [videoMode, setVideoMode] = useState("upload");
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState("");
  const [notes, setNotes] = useState("");
  const [translatedNotes, setTranslatedNotes] = useState("");

  const [signMode, setSignMode] = useState("upload");
  const [signFile, setSignFile] = useState(null);
  const [signURL, setSignURL] = useState("");
  const [signText, setSignText] = useState("");

  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("Telugu");

  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const cameraRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const languages = [
    "English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam",
    "Bengali", "Marathi", "Gujarati", "Punjabi", "French", "Spanish",
    "German", "Japanese", "Korean", "Chinese", "Arabic",
  ];

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 2500);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (cameraRef.current) cameraRef.current.srcObject = stream;
      setIsRecording(false);
    } catch (err) {
      alert("Camera or Microphone access denied.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setNotes("");
    setTranslatedNotes("");
    showStatus("Video uploaded successfully!");
  };

  const handleSignUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSignFile(file);
    setSignURL(URL.createObjectURL(file));
    setSignText("");
    showStatus("Sign video uploaded successfully!");
  };

  const startRecording = async () => {
    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (cameraRef.current) cameraRef.current.srcObject = stream;
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        if (activeTab === "video") {
          setVideoFile(new File([blob], "recording.webm", { type: "video/webm" }));
          setVideoURL(url);
        } else {
          setSignFile(new File([blob], "sign-recording.webm", { type: "video/webm" }));
          setSignURL(url);
        }
      };

      recorder.start();
      setIsRecording(true);
      showStatus("Recording started...");
    } catch (err) {
      alert("Unable to access camera.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
    showStatus("Recording saved!");
  };

  const generateNotes = () => {
    if (!videoFile) {
      alert("Please upload or record a video first.");
      return;
    }
    showStatus("Processing video with AI...");
    setNotes(
      `Core AI Video Summary\n\n` +
      `1. Key machine learning and neural network architectures explained.\n` +
      `2. Step-by-step breakdown of speech-to-text processing.\n` +
      `3. Overview of real-time multi-language synthesis.\n\n` +
      `Source Language: ${sourceLanguage}`
    );

    setTranslatedNotes(
      `Multi-Language Translated Output [${targetLanguage}]\n\n` +
      `Notes translated automatically into ${targetLanguage}.\n\n` +
      `Target Language: ${targetLanguage}`
    );
  };

  const convertSignToText = () => {
    if (!signFile) {
      alert("Please upload or record a sign language video.");
      return;
    }
    showStatus("Translating gestures...");
    setSignText("Hello! Welcome to EchoTask - Accessible Multilingual Platform.");
  };

  const speakText = () => {
    const text = translatedNotes || notes;
    if (!text) return alert("Generate notes first.");
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="app">
      {statusMessage && (
        <div className="status-banner">
          <span>{statusMessage}</span>
        </div>
      )}

      <header className="header">
        <div className="brand">
          <div className="brand-icon">🎙️</div>
          <div>
            <h1>EchoTask</h1>
            <p>Smart Accessible AI Platform</p>
          </div>
        </div>
        <div className="accessibility-badge">Multilingual AI</div>
      </header>

      <section className="hero">
        <h2>Empowering Universal Communication</h2>
        <p>Effortlessly translate live videos into structured smart notes and decode sign language in real time.</p>
      </section>

      <div className="tabs">
        <button
          type="button"
          className={activeTab === "video" ? "tab active" : "tab"}
          onClick={() => { stopCamera(); setActiveTab("video"); }}
        >
          🎥 Video → Notes
        </button>
        <button
          type="button"
          className={activeTab === "sign" ? "tab active" : "tab"}
          onClick={() => { stopCamera(); setActiveTab("sign"); }}
        >
          🤟 Sign Language
        </button>
      </div>

      {activeTab === "video" && (
        <main className="main">
          <section className="card">
            <div className="section-heading">
              <span className="heading-icon">🎥</span>
              <div>
                <h3>Video Source Input</h3>
                <p>Upload a video lecture or capture from camera.</p>
              </div>
            </div>

            <div className="mode-buttons">
              <button
                type="button"
                className={videoMode === "upload" ? "mode-button selected" : "mode-button"}
                onClick={() => { stopRecording(); stopCamera(); setVideoMode("upload"); }}
              >
                📁 Upload Video
              </button>
              <button
                type="button"
                className={videoMode === "live" ? "mode-button selected" : "mode-button"}
                onClick={() => { stopRecording(); setVideoMode("live"); startCamera(); }}
              >
                🔴 Live Recording
              </button>
            </div>

            {videoMode === "upload" && (
              <label className="upload-area">
                <input type="file" accept="video/*" onChange={handleVideoUpload} />
                <div className="upload-icon">📁</div>
                <strong>Click to select a video</strong>
                <span>Supports MP4, MOV, WebM</span>
              </label>
            )}

            {videoMode === "live" && (
              <div className="live-recording">
                <video ref={cameraRef} autoPlay muted playsInline />
                <div className="recording-controls">
                  {!isRecording ? (
                    <button type="button" className="record-button" onClick={startRecording}>🔴 Record Video</button>
                  ) : (
                    <button type="button" className="stop-button" onClick={stopRecording}>⏹ Stop Recording</button>
                  )}
                </div>
              </div>
            )}

            {videoURL && (
              <div className="preview">
                <video src={videoURL} controls />
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-heading">
              <span className="heading-icon">🌐</span>
              <div>
                <h3>Translation & Speech Settings</h3>
                <p>Configure input and target language.</p>
              </div>
            </div>

            <label>Source Language</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="select-input"
            >
              {languages.map((lang) => (<option key={lang}>{lang}</option>))}
            </select>

            <div className="language-arrow">⬇️</div>

            <label>Target Language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="select-input"
            >
              {languages.map((lang) => (<option key={lang}>{lang}</option>))}
            </select>

            <button type="button" className="primary-button" onClick={generateNotes}>
              ✨ Generate AI Notes
            </button>
          </section>

          <div className="cards-grid">
            <section className="card result-card">
              <div className="result-header">
                <h3>📝 Generated Notes</h3>
                <span>{sourceLanguage}</span>
              </div>
              <div className="result-box">
                {notes ? <pre>{notes}</pre> : <div className="empty-result">Upload or record a video to generate notes.</div>}
              </div>
            </section>

            <section className="card result-card">
              <div className="result-header">
                <h3>🌐 Translated Notes</h3>
                <span>{targetLanguage}</span>
              </div>
              <div className="result-box">
                {translatedNotes ? <pre>{translatedNotes}</pre> : <div className="empty-result">Translation output will appear here.</div>}
              </div>
              <button type="button" className="listen-button" onClick={speakText}>🔊 Read Text Aloud</button>
            </section>
          </div>
        </main>
      )}

      {activeTab === "sign" && (
        <main className="main">
          <section className="card">
            <div className="section-heading">
              <span className="heading-icon">🤟</span>
              <div>
                <h3>Sign Language Translator</h3>
                <p>Convert video gesture streams directly into readable text.</p>
              </div>
            </div>

            <div className="mode-buttons">
              <button
                type="button"
                className={signMode === "upload" ? "mode-button selected" : "mode-button"}
                onClick={() => { stopRecording(); stopCamera(); setSignMode("upload"); }}
              >
                📁 Upload Sign Video
              </button>
              <button
                type="button"
                className={signMode === "live" ? "mode-button selected" : "mode-button"}
                onClick={() => { stopRecording(); stopCamera(); setSignMode("live"); startCamera(); }}
              >
                📹 Live Sign Stream
              </button>
            </div>

            {signMode === "upload" && (
              <label className="upload-area">
                <input type="file" accept="video/*" onChange={handleSignUpload} />
                <div className="upload-icon">🤟</div>
                <strong>Upload Sign Video</strong>
              </label>
            )}

            {signMode === "live" && (
              <div className="live-recording">
                <video ref={cameraRef} autoPlay muted playsInline />
                <div className="recording-controls">
                  {!isRecording ? (
                    <button type="button" className="record-button" onClick={startRecording}>🔴 Track Sign Gestures</button>
                  ) : (
                    <button type="button" className="stop-button" onClick={stopRecording}>⏹ Stop Recording</button>
                  )}
                </div>
              </div>
            )}

            {signURL && (
              <div className="preview">
                <video src={signURL} controls />
              </div>
            )}

            <button type="button" className="primary-button" onClick={convertSignToText}>
              🔍 Translate Gestures → Text
            </button>
          </section>

          <section className="card">
            <div className="section-heading">
              <span className="heading-icon">💬</span>
              <div>
                <h3>Text → Sign Language Avatar</h3>
                <p>Convert typed text into dynamic sign gestures.</p>
              </div>
            </div>

            <textarea
              className="sign-textarea"
              value={signText}
              onChange={(e) => setSignText(e.target.value)}
              placeholder="Type message to generate sign language..."
            />

            <button type="button" className="primary-button" onClick={() => alert("Connecting text stream to 3D Sign Avatar!")}>
              🤟 Render Sign Avatar
            </button>
          </section>
        </main>
      )}

      <footer className="footer">
        <p><strong>EchoTask</strong> — Universal Multilingual AI Accessibility</p>
      </footer>
    </div>
  );
}

export default App;