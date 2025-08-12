const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const cloudinary = require('./cloudinary');
const Image = require('./models/Image');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔁 Redirect www. to non-www.
app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    const newHost = req.headers.host.slice(4); // Remove 'www.'
    return res.redirect(301, `https://${newHost}${req.originalUrl}`);
  }
  next();
});

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'royal-touch-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
  }),
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

// ✅ Multer memory storage for Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Upload Portfolio to Cloudinary
app.post('/upload-portfolio', requireLogin, upload.single('image'), async (req, res) => {
  try {
    const stream = cloudinary.uploader.upload_stream({ folder: 'portfolio' }, async (error, result) => {
      if (error) throw error;

      const image = new Image({
        title: req.body.title,
        url: result.secure_url,
        public_id: result.public_id,
        folder: 'portfolio'
      });

      await image.save();
      res.redirect(`/upload-success.html?img=${encodeURIComponent(image.url)}&type=portfolio`);
    });

    stream.end(req.file.buffer);
  } catch (err) {
    console.error('Portfolio upload error:', err);
    res.status(500).send('Upload failed');
  }
});

// ✅ Upload Gallery to Cloudinary
app.post('/upload-gallery', requireLogin, upload.single('image'), async (req, res) => {
  try {
    const stream = cloudinary.uploader.upload_stream({ folder: 'gallery' }, async (error, result) => {
      if (error) throw error;

      const image = new Image({
        title: req.body.title,
        url: result.secure_url,
        public_id: result.public_id,
        folder: 'gallery'
      });

      await image.save();
      res.redirect(`/upload-success.html?img=${encodeURIComponent(image.url)}&type=gallery`);
    });

    stream.end(req.file.buffer);
  } catch (err) {
    console.error('Gallery upload error:', err);
    res.status(500).send('Upload failed');
  }
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

// ✅ Delete Image from Cloudinary and DB
app.post('/delete-image', requireLogin, async (req, res) => {
  const { public_id, folder } = req.body;
  try {
    await cloudinary.uploader.destroy(public_id);
    const result = await Image.findOneAndDelete({ public_id, folder });
    if (!result) return res.status(404).json({ success: false, message: 'Image not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
});

// ✅ Static Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ✅ Site Map
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

app.get('/sitemap.xml', async (req, res) => {
  try {
    const links = [
      { url: '/', changefreq: 'monthly', priority: 1.0 },
      { url: '/gallery.html', changefreq: 'monthly', priority: 0.8 },
      { url: '/portfolio.html', changefreq: 'monthly', priority: 0.8 },
      { url: '/login.html', changefreq: 'yearly', priority: 0.2 },
    ];

    const stream = new SitemapStream({ hostname: 'https://royaltouchinterior.co.in' });

    res.header('Content-Type', 'application/xml');
    const xml = await streamToPromise(Readable.from(links).pipe(stream)).then((data) => data.toString());
    res.send(xml);
  } catch (err) {
    console.error('❌ Sitemap generation error:', err);
    res.status(500).end();
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('');
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});