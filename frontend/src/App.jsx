import { useState } from 'react';
import './App.css';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [videoFilePath, setVideoFilePath] = useState('');

  // --- REKAM SUARA ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        alert('✅ Rekaman selesai! Klik "Ganti Audio" untuk dubbing.');
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto stop setelah 10 detik (bisa diubah)
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 10000);
    } catch (err) {
      alert('❌ Gagal akses mikrofon: ' + err.message);
    }
  };

  // --- UPLOAD VIDEO KE SERVER ---
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      alert('⚠️ Silakan pilih file video (MP4, MOV, dll)');
      return;
    }

    setVideoFile(file);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('https://dubbing-app-backend.onrender.com/upload-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setVideoFilePath(result.filePath);
        alert('✅ Video berhasil diupload ke server!');
      } else {
        alert('❌ Gagal upload: ' + result.message);
      }
    } catch (error) {
      alert('❌ Error saat upload video: ' + error.message);
    }
  };

  // --- DUBBING: GABUNG VIDEO + AUDIO BARU ---
  const handleDubbing = async () => {
    if (!videoFilePath) {
      alert('⚠️ Silakan unggah video terlebih dahulu!');
      return;
    }
    if (!audioBlob) {
      alert('⚠️ Silakan rekam suara terlebih dahulu!');
      return;
    }

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('videoPath', videoFilePath);

    try {
      const response = await fetch('https://dubbing-app-backend.onrender.com/dubbing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      alert('🎉 Dubbing selesai! Klik "Download Hasil" untuk menyimpan.');
    } catch (error) {
      alert('❌ Gagal dubbing: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- DOWNLOAD HASIL DUBBING ---
  const downloadResult = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'dubbed-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Dubbing-App</h1>
        <p>Upload video → rekam suara → ganti audio → download hasil!</p>
      </header>

      <main style={{ padding: '20px', textAlign: 'center' }}>
        {/* UPLOAD VIDEO */}
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          style={{ marginBottom: '20px', padding: '10px' }}
        />

        {/* REKAM SUARA */}
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            margin: '10px',
            padding: '12px 20px',
            backgroundColor: isRecording ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        >
          {isRecording ? '⏳ Rekam... (10 detik)' : '🎙️ Rekam Suara Baru'}
        </button>

        {audioBlob && (
          <p style={{ color: '#007bff', marginTop: '10px' }}>
            ✅ Suara direkam ({(audioBlob.size / 1000).toFixed(1)} KB)
          </p>
        )}

        {/* GANTI AUDIO (DUBBING) */}
        <button
          onClick={handleDubbing}
          disabled={!videoFilePath || !audioBlob || isProcessing}
          style={{
            margin: '10px',
            padding: '12px 20px',
            backgroundColor: !videoFilePath || !audioBlob || isProcessing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
          }}
        >
          {isProcessing ? '⏳ Memproses...' : '🎬 Ganti Audio (Dubbing)'}
        </button>

        {/* DOWNLOAD HASIL */}
        {downloadUrl && (
          <button
            onClick={downloadResult}
            style={{
              margin: '10px',
              padding: '12px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
            }}
          >
            📥 Download Hasil Dubbing
          </button>
        )}

        {/* INFO */}
        <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', textAlign: 'left' }}>
          <h3>💡 Cara Kerja:</h3>
          <ol style={{ lineHeight: '1.6' }}>
            <li>Upload video (MP4/MOV)</li>
            <li>Klik “Rekam Suara Baru” → bicara 10 detik</li>
            <li>Klik “Ganti Audio” → server gabungkan video + suara baru</li>
            <li>Klik “Download Hasil” → simpan ke ponsel!</li>
          </ol>
          <p><strong>Fitur ini berjalan di cloud — tidak butuh aplikasi tambahan!</strong></p>
        </div>
      </main>
    </div>
  );
}

export default App;