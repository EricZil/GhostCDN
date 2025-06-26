require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const uploadRoutes = require('./routes/upload.routes');
const storageRoutes = require('./routes/storage.routes');
const validateApiKey = require('./middleware/apiKey.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint (no API key required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'GhostCDN API is running' });
});

// API routes with API key validation
app.use('/api/upload', validateApiKey, uploadRoutes);
app.use('/api/storage', validateApiKey, storageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 