const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  title: String,
  url: String,
  public_id: String,
  folder: String, // "gallery" or "portfolio"
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Image', imageSchema);