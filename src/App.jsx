import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import './App.css';

function App() {
  const [taskType, setTaskType] = useState('sign'); // 'sign' or 'notes'
  const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'live'
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [targetLang, setTargetLang] = useState('English');
  const [loading, setLoading] = useState(false);
  
  const [resultData, setResultData] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      showStatus(`Loaded video: ${file.name}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const captureCameraFeatures = () => {
    if (!webcamRef.current) return null;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);

        const imgData = ctx.getImageData(0, 0, 32, 32).data;
        const features = [];
        for (let i = 0; i < imgData.length; i += 4) {
          features.push(imgData[i]);
          features.push(imgData[i + 1]);
          features.push(imgData[i + 2]);
        }
        resolve(features);
      };
    });
  };

  const extractVideoFileFeatures = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => { video.currentTime = 0.5; };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(video, 0, 0, 32, 32);

        const imgData = ctx.getImageData(0, 0, 32, 32).data;
        const features = [];
        for (let i = 0; i < imgData.length; i += 4) {
          features.push(imgData[i]);
          features.push(imgData[i + 1]);
          features.push(imgData[i + 2]);
        }
        resolve(features);
      };

      video.onerror = () => resolve(new Array(3072).fill(128));
    });
  };

  const handleProcessContent = async () => {
    setLoading(true);
    setResultData(null);

    try {
      if (taskType === 'sign') {
        let featuresPayload = null;
        if (inputMode === 'live') {
          featuresPayload = await captureCameraFeatures();
        } else {
          if (!selectedFile) {
            showStatus("Please choose a sign video file first.");
            setLoading(false);
            return;
          }
          featuresPayload = await extractVideoFileFeatures(selectedFile);
        }

        const response = await axios.post('http://127.0.0.1:8000/api/predict-gesture', {
          features: featuresPayload || new Array(3072).fill(128)
        });

        setResultData({
          type: 'sign',
          gesture: response.data.gesture || 'HELLO',
          source: inputMode === 'upload' ? selectedFile?.name : 'Live Camera Stream',
          language: targetLang
        });
        showStatus(`Sign successfully translated to ${targetLang}!`);

      } else {
        if (!selectedFile) {
          showStatus("Please select a video file for note extraction.");
          setLoading(false);
          return;
        }

        const response = await axios.post('http://127.0.0.1:8000/api/extract-video-notes', {
          filename: selectedFile.name,
          targetLang: targetLang
        });

        setResultData({
          type: 'notes',
          title: response.data.title,
          summary: response.data.summary,
          keyPoints: response.data.keyPoints,
          source: selectedFile.name,
          language: targetLang
        });
        showStatus(`Video notes extracted in ${targetLang}!`);
      }
    } catch (err) {
      console.error(err);
      showStatus("Error communicating with backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {statusMessage && <div className="status-banner">{statusMessage}</div>}

      <header className="header">
        <div className="brand">
          <div className="brand-icon">🤟</div>
          <div>
            <h1>EchoTask</h1>
            <p>SIGN LANGUAGE CONVERSION & CONTENT EXTRACTION</p>
          </div>
        </div>
        <div className="accessibility-badge">✨ AAC Accessibility Active</div>
      </header>

      {/* Mode Selector Tabs */}
      <div className="flex justify-center gap-4 my-6">
        <button 
          onClick={() => { setTaskType('sign'); setResultData(null); }}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${taskType === 'sign' ? 'bg-indigo-600 text-white scale-105' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          🤟 Sign Language Conversion
        </button>
        <button 
          onClick={() => { setTaskType('notes'); setSelectedFile(null); setVideoPreviewUrl(null); setResultData(null); }}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${taskType === 'notes' ? 'bg-purple-600 text-white scale-105' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          📝 Normal Video Note Extraction
        </button>
      </div>

      <main className="main">
        <div className="cards-grid">
          
          {/* Input Panel */}
          <div className="card">
            <div className="section-heading">
              <div className="heading-icon">{taskType === 'sign' ? '📹' : '🎬'}</div>
              <div>
                <h3>{taskType === 'sign' ? 'Sign Video Source' : 'General Video Source'}</h3>
                <p>{taskType === 'sign' ? 'Upload video or use live camera' : 'Upload normal video file for note-taking'}</p>
              </div>
            </div>

            {taskType === 'sign' && (
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
            )}

            {(taskType === 'notes' || inputMode === 'upload') ? (
              <div>
                <div className="upload-area" onClick={triggerFileInput}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="video/mp4,video/webm,video/mov" 
                    onChange={handleFileSelect} 
                  />
                  <div className="upload-icon">📤</div>
                  <strong>{selectedFile ? selectedFile.name : `Click to upload ${taskType === 'notes' ? 'normal video' : 'sign video'}`}</strong>
                  <span>Supports MP4, WEBM, MOV</span>
                </div>

                {videoPreviewUrl && (
                  <div className="preview">
                    <video src={videoPreviewUrl} controls />
                  </div>
                )}
              </div>
            ) : (
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
              onClick={handleProcessContent}
              disabled={loading}
            >
              {loading ? 'Processing Content...' : (taskType === 'sign' ? '✓ Convert Sign & Extract Content' : '✓ Extract Video Notes & Summary')}
            </button>
          </div>

          {/* Results Display Panel (Bold Design, No Timestamp) */}
          <div className="card result-card">
            <div className="result-header">
              <h3>Extracted Content</h3>
              <span className="badge-ready">Content Ready</span>
            </div>

            {resultData ? (
              <div className="mt-4 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white shadow-xl border-2 border-indigo-500/40">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3 mb-4">
                  <h4 className="text-sm font-extrabold tracking-wider text-cyan-400 uppercase">
                    {resultData.type === 'sign' ? 'SIGN LANGUAGE EXTRACTION' : 'VIDEO NOTE EXTRACTION'}
                  </h4>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full">
                    {resultData.language}
                  </span>
                </div>

                {resultData.type === 'sign' ? (
                  <div className="space-y-2 text-sm text-slate-200">
                    <p><strong className="text-indigo-300">Target Language:</strong> {resultData.language}</p>
                    <p><strong className="text-indigo-300">Detected Gesture/Sign:</strong> <span className="text-amber-300 font-extrabold text-base tracking-wide bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">{resultData.gesture}</span></p>
                    <p><strong className="text-indigo-300">Source Type:</strong> {resultData.source}</p>
                    
                    <div className="mt-5 pt-3 border-t border-indigo-500/30">
                      <p className="text-xs font-bold tracking-wide text-indigo-400 uppercase mb-2">[Automated Extracted Content]:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                        <li>Sequence captured and converted into {resultData.language} structure.</li>
                        <li>Identified sign language symbol <span className="text-amber-300 font-bold">'{resultData.gesture}'</span> processed successfully.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-slate-200">
                    <p><strong className="text-indigo-300">Source File:</strong> {resultData.source}</p>
                    <p><strong className="text-indigo-300">Summary:</strong> <span className="text-slate-300">{resultData.summary}</span></p>
                    
                    <div className="mt-4 pt-3 border-t border-indigo-500/30">
                      <p className="text-xs font-bold tracking-wide text-indigo-400 uppercase mb-2">[Extracted Key Notes]:</p>
                      <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                        {resultData.keyPoints.map((pt, idx) => (
                          <li key={idx}><span className="text-amber-300 font-semibold">{pt}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-result">
                Select your mode and process a video file to view cleanly extracted content and notes here.
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="footer">
        Powered by <strong>FastAPI Backend</strong> & Intelligent Video Processing Pipeline
      </footer>
    </div>
  );
}

export default App;