const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

// Import the database blueprints 
const Visit = require('./models/Visit');
const Lead = require('./models/Lead');

const app = express();
app.use(express.json()); // Allows our server to read JSON data sent by the frontend
app.use(cors());         // Stops browser from blocking requests to this server

// Connecting to cloud MongoDB database
const mongoURI = "mongodb+srv://admin:Diya11403@cluster0.jr7odeo.mongodb.net/?appName=Cluster0"; 
mongoose.connect(mongoURI)
  .then(() => console.log('🚀 Success: Connected to MongoDB Cloud!'))
  .catch(err => console.error('❌ Database connection error:', err));

// Tracking Traffic to our tool
app.post('/api/track-visit', async (req, res) => {
  try {
    const newVisit = new Visit({
      userAgent: req.body.userAgent,
      referrer: req.body.referrer
    });
    await newVisit.save(); // Saves the visitor straight into the cloud database
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log traffic' });
  }
});

// ROUTE 2: Scraping and Analyzing a Business Website
app.post('/api/scan', async (req, res) => {
  try {
    const { targetUrl } = req.body;

    // 1. Downloading the raw HTML code of the business website
    const response = await axios.get(targetUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 6000 // If website doesn't load in 6 seconds, cancel it
    });
    const html = response.data;

    const $ = cheerio.load(html);

    // 3. Inspecting the code for clues across our 5 pillars
    const report = {
      measurement: {
        pass: html.includes('gtag') || html.includes('google-analytics'),
        advice: "Missing Analytics tracking code. You cannot see how many potential customers visit your site."
      },
      retargeting: {
        pass: html.includes('fbevents.js') || html.includes('connect.facebook.net'),
        advice: "Missing advertising pixels. You cannot run follow-up ads on Facebook/Instagram to users who left your site."
      },
      conversion: {
        pass: $('form').length > 0 || html.includes('wa.me'),
        advice: "No contact forms or instant WhatsApp chat buttons found. It is too difficult for customers to hire you."
      },
      security: {
        pass: targetUrl.startsWith('https://'),
        advice: "Your connection is insecure. Your business requires an encrypted HTTPS connection SSL certificate."
      },
      aiSearch: {
        pass: html.includes('application/ld+json'),
        advice: "Missing Schema Structure code. Modern AI search systems like ChatGPT Search or Google AI Overviews cannot read your layout."
      }
    };

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not fetch or read that website. Double-check the spelling.' });
  }
});

// ROUTE 3: Saving a Captured Email Lead
app.post('/api/save-lead', async (req, res) => {
  try {
    const newLead = new Lead({
      email: req.body.email,
      scannedUrl: req.body.scannedUrl
    });
    await newLead.save(); // Saves email link straight into MongoDB
    res.status(201).json({ success: true, message: 'Lead recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Database saving failure' });
  }
});

// Start the server engine on local port 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`🔥 Scanner engine live on http://localhost:${PORT}`));
