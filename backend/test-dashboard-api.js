const fetch = require('node-fetch');

async function testDashboardAPI() {
  try {
    console.log('=== Testing Dashboard API ===');
    
    const API_URL = 'http://localhost:3001';
    const API_KEY = process.env.API_KEY || 'your-api-key-here';
    const testEmail = 'eric@nezser.com';
    
    console.log(`Testing API: ${API_URL}`);
    console.log(`Testing for user: ${testEmail}`);
    
    // Test the exact endpoint that frontend calls
    const endpoint = `${API_URL}/api/dashboard/uploads/${testEmail}`;
    
    console.log(`\nCalling: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n--- API Response ---');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.success && data.uploads) {
        console.log(`\n--- Found ${data.uploads.length} files ---`);
        data.uploads.forEach((file, index) => {
          console.log(`${index + 1}. ${file.fileName} (${file.fileKey})`);
        });
      } else {
        console.log('❌ No uploads found or API returned error');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:');
      console.log(errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardAPI();