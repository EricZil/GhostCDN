/**
 * Script to generate a secure API key for internal use (frontend-backend communication)
 * Run with: node scripts/generate-api-key.js
 */

const crypto = require('crypto');

// Generate a secure random API key
const apiKey = crypto.randomBytes(32).toString('hex');

console.log('\n==================================');
console.log('🔑 GhostCDN Internal API Key 🔑');
console.log('==================================\n');

console.log('Generated API Key:');
console.log('\x1b[32m%s\x1b[0m', apiKey);
console.log('\nAdd this key to your environment files:');

console.log('\n1. Backend (.env):');
console.log('\x1b[36m%s\x1b[0m', 'API_KEY=' + apiKey);

console.log('\n2. Frontend (.env.local):');
console.log('\x1b[36m%s\x1b[0m', 'API_KEY=' + apiKey);

console.log('\n⚠️  Keep this key secure and never commit it to GitHub!\n'); 