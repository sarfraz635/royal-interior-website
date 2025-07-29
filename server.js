const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary dynamic folder storage
const { getStorage } = require('./storage');

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'royal-touch-secret',
  resave: false,
  saveUninitialized: true
}));

// Auth middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) next();
  else res.redirect('/login.html');
}

// ==== Routes ====

// Login
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Admin panel pages
app.get('/upload.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});
app.get('/upload_gallery.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_gallery.html'));
});
app.get('/upload_portfolio.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload_portfolio.html'));
});

// Login process
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

// ==== Upload Gallery with Title ====
app.post('/upload-gallery', requireLogin, multer({ storage: getStorage('gallery') }).single('image'), (req, res) => {
  const title = req.body.title || req.file.originalname;
  const imageUrl = req.file.path;
  const metadataPath = path.join(__dirname, 'uploads', 'gallery', 'metadata.json');

  const dir = path.dirname(metadataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];

  metadata.push({
    title,
    url: imageUrl,
    public_id: req.file.filename
  });

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  res.redirect(`/upload-success.html?img=${encodeURIComponent(imageUrl)}&type=gallery`);
});

// ==== Upload Portfolio with Title ====
app.post('/upload-portfolio', requireLogin, multer({ storage: getStorage('portfolio') }).single('image'), (req, res) => {
  const title = req.body.title || req.file.originalname;
  const imageUrl = req.file.path;
  const metadataPath = path.join(__dirname, 'uploads', 'portfolio', 'metadata.json');

  const dir = path.dirname(metadataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];

  metadata.push({
    title,
    url: imageUrl,
    public_id: req.file.filename
  });

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  res.redirect(`/upload-success.html?img=${encodeURIComponent(imageUrl)}&type=portfolio`);
});

// ==== API: View Metadata ====
app.get('/images/gallery', (req, res) => {
  const metadataPath = path.join(__dirname, 'uploads', 'gallery', 'metadata.json');
  const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];
  res.json({ files: metadata });
});

app.get('/images/portfolio', (req, res) => {
  const metadataPath = path.join(__dirname, 'uploads', 'portfolio', 'metadata.json');
  const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath)) : [];
  res.json({ files: metadata });
});

// ==== Placeholder for Delete Functionality ====
app.post('/delete-image', requireLogin, (req, res) => {
  res.status(501).json({ success: false, message: "Cloudinary delete not implemented yet" });
});

// ==== Static Routes ====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ==== Start Server ====
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});