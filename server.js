const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // ✅ Needed for JSON in delete requests

// Session setup
app.use(session({
  secret: 'royal-touch-secret',
  resave: false,
  saveUninitialized: true
}));

// Auth middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// ==== File Upload Config ====

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'gallery');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadGallery = multer({ storage: galleryStorage });

const portfolioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'portfolio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadPortfolio = multer({ storage: portfolioStorage });

// ==== Routes ====

// Login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Admin pages
app.get('/upload.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});
app.get('/upload_gallery.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_gallery.html'));
});
app.get('/upload_portfolio.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_portfolio.html'));
});

// Admin credentials
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/upload.html');
  } else {
    res.send('<h2>Invalid credentials</h2><a href="/login.html">Try Again</a>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

// Uploads
app.post('/upload-gallery', requireLogin, uploadGallery.single('image'), (req, res) => {
  if (!req.file) return res.send('No file uploaded.');

  const title = req.body.title || req.file.originalname;
  const metadataPath = path.join(__dirname, 'uploads', 'gallery', 'metadata.json');

  let metadata = [];
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath));
  }

  metadata.push({ filename: req.file.filename, title });
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  res.redirect('/upload-success.html?type=gallery');
});

app.post('/upload-portfolio', requireLogin, uploadPortfolio.single('image'), (req, res) => {
  if (!req.file) return res.send('No file uploaded.');

  const title = req.body.title || req.file.originalname;
  const metadataPath = path.join(__dirname, 'uploads', 'portfolio', 'metadata.json');

  let metadata = [];
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath));
  }

  metadata.push({ filename: req.file.filename, title });
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  res.redirect('/upload-success.html?type=portfolio');
});

// Gallery API
app.get('/images/gallery', (req, res) => {
  const metadataPath = path.join(__dirname, 'uploads', 'gallery', 'metadata.json');
  const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];
  res.json({
    loggedIn: req.session.loggedIn || false,
    files: metadata
  });
});

// Portfolio API
app.get('/images/portfolio', (req, res) => {
  const metadataPath = path.join(__dirname, 'uploads', 'portfolio', 'metadata.json');
  const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];
  res.json({
    loggedIn: req.session.loggedIn || false,
    files: metadata
  });
});

// ==== 🆕 Delete Image Endpoint ====
app.post('/delete-image', requireLogin, (req, res) => {
  const { filename, folder } = req.body;

  if (!filename || !folder) {
    return res.status(400).json({ success: false, message: "Missing filename or folder" });
  }

  const filePath = path.join(__dirname, 'uploads', folder, filename);
  const metadataPath = path.join(__dirname, 'uploads', folder, 'metadata.json');

  // Delete image file
  fs.unlink(filePath, err => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to delete image:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete image' });
    }

    // Update metadata
    let metadata = [];
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath));
      metadata = metadata.filter(entry => entry.filename !== filename);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    res.json({ success: true });
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});