const { createProgressBar, formatBytes } = require('./src/utils/display');

// Test the progress bar functionality
async function testProgressBar() {
  console.log('Testing progress bar...\n');
  
  const progressBar = createProgressBar();
  const totalSize = 100 * 1024 * 1024; // 100MB
  let uploaded = 0;
  
  progressBar.start(totalSize, 0);
  
  const interval = setInterval(() => {
    uploaded += 1024 * 1024; // 1MB per update
    const progress = uploaded / totalSize;
    
    if (progress >= 1) {
      progressBar.update(1, {
        filename: 'test-file.rar',
        uploaded: formatBytes(totalSize),
        total: formatBytes(totalSize),
        speed: '5 MB/s',
        eta: '0s'
      });
      progressBar.stop();
      clearInterval(interval);
      console.log('Test completed successfully!');
      return;
    }
    
    progressBar.update(progress, {
      filename: 'test-file.rar',
      uploaded: formatBytes(uploaded),
      total: formatBytes(totalSize),
      speed: '5 MB/s',
      eta: Math.round((totalSize - uploaded) / (5 * 1024 * 1024)) + 's'
    });
  }, 100);
}

testProgressBar();