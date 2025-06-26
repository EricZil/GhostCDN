/**
 * API Key authentication middleware
 * For internal use only - secures communication between frontend and backend
 */

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!validApiKey) {
    console.warn('API_KEY not set in environment. Skipping API key validation.');
    return next();
  }
  
  if (isDevelopment) {
    if (!apiKey) {
      console.warn('No API key provided in development mode. Allowing request but this would be rejected in production.');
      return next();
    }
    
    if (apiKey !== validApiKey) {
      console.warn('API key mismatch in development mode. Allowing request but this would be rejected in production.');
      return next();
    }
  } else {
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API key'
      });
    }
  }
  
  next();
};

module.exports = validateApiKey; 