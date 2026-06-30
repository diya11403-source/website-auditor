const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const nodemailer = require('nodemailer');

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

const transporter = nodemailer.createTransport({
  service: 'gmail', // Let Nodemailer handle the ports behind the scenes
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

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

// ROUTE 3: Saving a Captured Email Lead & Delivering Automated Email Report
app.post('/api/save-lead', async (req, res) => {
  try {
    // We extract reportData along with email and scannedUrl here
    const { email, scannedUrl, reportData } = req.body;

    // 1. Saves email link straight into MongoDB
    const newLead = new Lead({ email, scannedUrl });
    await newLead.save(); 

    // 2. Format the 5-pillar results into clean HTML elements for the email body
    let reportSummaryHtml = '';
    if (reportData) {
      for (const [pillar, data] of Object.entries(reportData)) {
        const status = data.pass ? '✅ PASSED' : '❌ MISSING';
        const color = data.pass ? '#10b981' : '#f43f5e';
        reportSummaryHtml += `
          <div style="margin-bottom: 15px; padding: 12px; border-left: 4px solid ${color}; background-color: #f8fafc; font-family: sans-serif;">
            <strong style="text-transform: capitalize; font-size: 16px;">${pillar}</strong>: 
            <span style="color: ${color}; font-weight: bold;">${status}</span>
            ${!data.pass ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">${data.advice}</p>` : ''}
          </div>
        `;
      }
    } else {
      reportSummaryHtml = '<p>Audit data was unavailable, but your scan session was recorded successfully.</p>';
    }

    // 3. Draft the email configurations using the environment user address
    const mailOptions = {
      from: `"The Website Auditor" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Website Audit Results for ${scannedUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e1b4b;">Your 5-Pillar Executive Summary</h2>
          <p>Thank you for auditing your site. Here is what we found for <strong>${scannedUrl}</strong>:</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          
          ${reportSummaryHtml}
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p><strong>Want us to fix these gaps for you?</strong> Let's scale your traffic across the USA, UK, UAE, and Australia.</p>
          <a href="https://wa.me/919836594201" style="background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Chat with us on WhatsApp</a>
        </div>
      `
    };

    // 4. Fire off the email report to the lead
    await transporter.sendMail(mailOptions);

    res.status(201).json({ success: true, message: 'Lead recorded and email report sent successfully!' });
  } catch (err) {
    console.error("Error in /api/save-lead:", err);
    res.status(500).json({ error: 'Database saving or email delivery failure' });
  }
});

// Start the server engine on local port 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`🔥 Scanner engine live on http://localhost:${PORT}`));
