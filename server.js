const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const Image = require('./models/Image'); // Image schema

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'royal-touch-secret',
  resave: false,
  saveUninitialized: true
}));

// ✅ Auth middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  return res.redirect('/login.html');
}

// ✅ Admin Routes
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/upload.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'upload.html')));
app.get('/upload_gallery.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'upload_gallery.html')));
app.get('/upload_portfolio.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'upload_portfolio.html')));

// ✅ Login check
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
    if (err) return res.send('Logout error');
    res.redirect('/login.html');
  });
});

// ✅ Ensure upload folder exists
const ensureFolderExists = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.originalUrl.includes('portfolio') ? 'uploads/portfolio' : 'uploads/gallery';
    ensureFolderExists(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ✅ Upload Portfolio
app.post('/upload-portfolio', requireLogin, upload.single('image'), async (req, res) => {
  const image = new Image({
    title: req.body.title,
    url: `/uploads/portfolio/${req.file.filename}`,
    public_id: req.file.filename,
    folder: 'portfolio'
  });
  await image.save();
  res.redirect(`/upload-success.html?img=${encodeURIComponent(image.url)}&type=portfolio`);
});

// ✅ Upload Gallery
app.post('/upload-gallery', requireLogin, upload.single('image'), async (req, res) => {
  const image = new Image({
    title: req.body.title,
    url: `/uploads/gallery/${req.file.filename}`,
    public_id: req.file.filename,
    folder: 'gallery'
  });
  await image.save();
  res.redirect(`/upload-success.html?img=${encodeURIComponent(image.url)}&type=gallery`);
});

// ✅ Get Gallery Images
app.get('/images/gallery', async (req, res) => {
  const files = await Image.find({ folder: 'gallery' });
  res.json({ files, loggedIn: req.session.loggedIn });
});

// ✅ Get Portfolio Images
app.get('/images/portfolio', async (req, res) => {
  const files = await Image.find({ folder: 'portfolio' });
  res.json({ files, loggedIn: req.session.loggedIn });
});

// ✅ Delete Image
app.post('/delete-image', requireLogin, async (req, res) => {
  const { public_id, folder } = req.body;
  const result = await Image.findOneAndDelete({ public_id, folder });
  if (!result) return res.status(404).json({ success: false, message: 'Image not found' });
  res.json({ success: true });
});

// ✅ Static Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});