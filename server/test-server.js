const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing POS Server Startup...\n');

// Start the server
const server = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  const message = data.toString();
  output += message;
  console.log(message.trim());
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  errorOutput += message;
  console.error('❌ Error:', message.trim());
});

server.on('close', (code) => {
  console.log(`\n🔍 Server process exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ Server started successfully!');
  } else {
    console.log('❌ Server failed to start properly');
    console.log('\n📋 Error Summary:');
    console.log(errorOutput);
  }
  
  // Kill the server after 10 seconds
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 10000);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test...');
  server.kill();
  process.exit(0);
});

console.log('⏳ Server will run for 10 seconds to test startup...');
console.log('Press Ctrl+C to stop early\n');
