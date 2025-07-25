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

// Session setup
app.use(session({
  secret: 'royal-touch-secret',
  resave: false,
  saveUninitialized: true
}));

// Authentication middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// === File Upload Configs ===

// GALLERY storage
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'gallery');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadGallery = multer({ storage: galleryStorage });

// PORTFOLIO storage
const portfolioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'portfolio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadPortfolio = multer({ storage: portfolioStorage });

// === ROUTES ===

// Login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Admin dashboard page
app.get('/upload.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});

// Upload forms
app.get('/upload_gallery.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_gallery.html'));
});
app.get('/upload_portfolio.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_portfolio.html'));
});

// Login handling
// Define admin credentials from environment variables (or fallback defaults)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/upload.html');
  } else {
    res.send('<h2>Invalid credentials</h2><a href="/login.html">Try Again</a>');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login.html');
  });
});

// Upload POST (gallery)
app.post('/upload-gallery', requireLogin, uploadGallery.single('image'), (req, res) => {
  if (!req.file) return res.send('No file uploaded.');
  res.redirect('/upload-success.html?type=gallery');
});

// Upload POST (portfolio)
app.post('/upload-portfolio', requireLogin, uploadPortfolio.single('image'), (req, res) => {
  if (!req.file) return res.send('No file uploaded.');
  res.redirect('/upload-success.html?type=portfolio');
});

// Get uploaded gallery images
app.get('/images/gallery', (req, res) => {
  const dir = path.join(__dirname, 'uploads', 'gallery');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to load images' });
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.json(imageFiles);
  });
});

// Get uploaded portfolio images
app.get('/images/portfolio', (req, res) => {
  const dir = path.join(__dirname, 'uploads', 'portfolio');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to load images' });
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.json(imageFiles);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});