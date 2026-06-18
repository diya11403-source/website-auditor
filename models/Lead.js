const mongoose = require('mongoose');

// This defines the structure of an captured "Email Lead"
const LeadSchema = new mongoose.Schema({
  email: { type: String, required: true },
  scannedUrl: { type: String, required: true },
  capturedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);