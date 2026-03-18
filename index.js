const express = require('express');
const cors = require('cors');
require('dotenv').config();

const mailRoutes = require('./routes/mail');
const newsletterRoutes = require('./routes/newsletter');
const blogRoutes = require('./routes/blog');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/mail', mailRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/blog', blogRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root Route
app.get('/', (req, res) => {
  res.send('AgencyMail Backend API is running. Go to http://localhost:3000 to use the website.');
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
