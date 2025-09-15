const express = require('express');
const multer = require('multer');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

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
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve frontend later (via Vercel), for now just test API
app.get('/', (req, res) => {
  res.send('✅ Dubbing App Backend is running!');
});

// Upload video endpoint
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No video uploaded.');

  res.json({
    message: 'Video uploaded successfully!',
    filePath: req.file.path,
    fileName: req.file.filename
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});