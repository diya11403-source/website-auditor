const mongoose = require('mongoose');

// This defines the structure of a "Traffic Log" document in MongoDB
const VisitSchema = new mongoose.Schema({
  visitedAt: { type: Date, default: Date.now }, // Saves exact date/time
  userAgent: String,                            // Saves browser details (Chrome, Safari, etc.)
  referrer: String                              // Saves where they clicked from
});

module.exports = mongoose.model('Visit', VisitSchema);