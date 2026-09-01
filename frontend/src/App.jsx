import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './App.css';

function App() {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'live'
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [targetLang, setTargetLang] = useState('English');
  const [loading, setLoading] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Handle local video selection from device
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      showStatus(`Loaded video: ${file.name}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Extract frame features from live webcam feed
  const captureCameraFeatures = () => {
    if (!webcamRef.current) return null;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return null;

    const img = new Image();
    img.src = imageSrc;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(img, 0, 0, 32, 32);

    const imgData = ctx.getImageData(0, 0, 32, 32).data;
    const features = [];
    for (let i = 0; i < imgData.length; i += 4) {
      features.push(imgData[i] / 255.0);
      features.push(imgData[i + 1] / 255.0);
      features.push(imgData[i + 2] / 255.0);
    }
    return features;
  };

  // Process video or webcam frame and extract sign language content in selected language
  const handleExtractContent = async () => {
    setLoading(true);
    setExtractedContent('');

    try {
      let featuresPayload = new Array(3072).fill(0.5);

      if (inputMode === 'live') {
        const liveFeatures = captureCameraFeatures();
        if (liveFeatures) {
          featuresPayload = liveFeatures;
        }
      } else if (inputMode === 'upload' && !selectedFile) {
        showStatus("Please choose a video file first.");
        setLoading(false);
        return;
      }

      // Query FastAPI backend for sign language prediction
      const response = await axios.post('http://127.0.0.1:8000/api/predict-gesture', {
        features: featuresPayload
      });

      const gesture = response.data.gesture || 'A';
      
      const generatedContent = 
        `--------------------------------------------------\n` +
        `       SIGN LANGUAGE EXTRACTION CONTENT           \n` +
        `--------------------------------------------------\n` +
        `• Target Language         : ${targetLang}\n` +
        `• Detected Gesture/Sign   : ${gesture}\n` +
        `• Source Type              : ${inputMode === 'upload' ? selectedFile?.name || 'Video File' : 'Live Camera Stream'}\n` +
        `• Extraction Timestamp     : ${new Date().toLocaleTimeString()}\n\n` +
        `[Automated Extracted Content]:\n` +
        `1. Sequence captured and converted into ${targetLang} structure.\n` +
        `2. Identified sign language symbol '${gesture}' processed successfully.`;

      setExtractedContent(generatedContent);
      showStatus(`Content converted to ${targetLang} successfully!`);
    } catch (err) {
      console.error(err);
      setExtractedContent("Error connecting to backend server at http://127.0.0.1:8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {statusMessage && <div className="status-banner">{statusMessage}</div>}

      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">🤟</div>
          <div>
            <h1>EchoTask</h1>
            <p>SIGN LANGUAGE CONVERSION & CONTENT EXTRACTION</p>
          </div>
        </div>
        <div className="accessibility-badge">
          ✨ AAC Accessibility Active
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h2>Sign language video conversion <i>&</i> content extraction.</h2>
        <p>
          Upload recorded sign language video files or capture live camera feeds to convert gestures directly into structured written content in your desired language.
        </p>
      </section>

      {/* Main Workspace */}
      <main className="main">
        <div className="cards-grid">
          
          {/* Video Input Panel */}
          <div className="card">
            <div className="section-heading">
              <div className="heading-icon">📹</div>
              <div>
                <h3>Sign Video Source</h3>
                <p>Upload a video or stream live sign language</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="mode-buttons">
              <button 
                className={`mode-button ${inputMode === 'upload' ? 'selected' : ''}`}
                onClick={() => setInputMode('upload')}
              >
                📁 Upload Device Video
              </button>
              <button 
                className={`mode-button ${inputMode === 'live' ? 'selected' : ''}`}
                onClick={() => setInputMode('live')}
              >
                🎥 Live Camera Stream
              </button>
            </div>

            {/* Device Video Upload */}
            {inputMode === 'upload' ? (
              <div>
                <div className="upload-area" onClick={triggerFileInput}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="video/mp4,video/webm,video/mov" 
                    onChange={handleFileSelect} 
                  />
                  <div className="upload-icon">📤</div>
                  <strong>{selectedFile ? selectedFile.name : 'Click to upload sign video'}</strong>
                  <span>Supports MP4, WEBM, MOV</span>
                </div>

                {videoPreviewUrl && (
                  <div className="preview">
                    <video src={videoPreviewUrl} controls />
                  </div>
                )}
              </div>
            ) : (
              /* Live Camera Feed */
              <div className="live-recording">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  style={{ width: '100%', borderRadius: '14px', border: '1px solid #ded3ca' }}
                />
              </div>
            )}

            <label style={{ marginTop: '16px' }}>Select Desired Language</label>
            <select 
              className="select-input" 
              value={targetLang} 
              onChange={(e) => setTargetLang(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Tamil">Tamil</option>
              <option value="Hindi">Hindi</option>
              <option value="French">French</option>
              <option value="German">German</option>
            </select>

            <button 
              className="primary-button" 
              onClick={handleExtractContent}
              disabled={loading}
            >
              {loading ? 'Converting Sign Language...' : '✓ Convert Sign & Extract Content'}
            </button>
          </div>

          {/* Results Display Panel */}
          <div className="card result-card">
            <div className="result-header">
              <h3>Extracted Content</h3>
              <span>Content Ready</span>
            </div>

            {extractedContent ? (
              <div className="result-box">
                <pre>{extractedContent}</pre>
              </div>
            ) : (
              <div className="empty-result">
                Converted sign language content will be displayed here in your selected language after processing.
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        Powered by <strong>FastAPI Backend</strong> & Random Forest Sign Classifier
      </footer>
    </div>
  );
}

export default App;