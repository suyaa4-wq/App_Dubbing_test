const express = require('express');
const multer = require('multer');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Create uploads folder if not exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve root
app.get('/', (req, res) => {
  res.send('✅ Dubbing App Backend is running!');
});

// Upload video only
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No video uploaded.');
  res.json({
    message: 'Video uploaded successfully!',
    filePath: req.file.path,
    fileName: req.file.filename
  });
});

// ✅ FITUR DUBBING UTAMA: Gabung video + audio baru
app.post('/dubbing', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });
    if (!req.body.video) return res.status(400).json({ error: 'No video provided.' });

    const videoPath = req.files?.video?.path || '';
    const audioPath = req.file.path;
    const outputPath = path.join('uploads', `dubbed-${Date.now()}.mp4`);

    // Cek apakah file video ada
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found.' });
    }

    // Gunakan FFmpeg untuk ganti audio
    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', videoPath,     // Input video
      '-i', audioPath,     // Input audio baru
      '-c:v', 'copy',      // Salin video tanpa kompresi
      '-c:a', 'aac',       // Encode audio ke AAC
      '-strict', 'experimental',
      '-shortest',         // Sesuaikan durasi dengan yang lebih pendek
      outputPath
    ]);

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'FFmpeg failed to process.' });
    });

    ffmpegProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`FFmpeg exited with code ${code}`);
        return res.status(500).json({ error: 'Failed to create dubbed video.' });
      }

      // Kirim file hasil sebagai respons download
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="dubbed-video.mp4"');
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({ error: 'Error sending file.' });
        } else {
          // Hapus file sementara setelah dikirim
          fs.unlinkSync(outputPath);
          fs.unlinkSync(audioPath);
          if (videoPath) fs.unlinkSync(videoPath);
        }
      });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});