#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🐍 Starting Bennu Finance Python FastAPI application...');

const python = spawn('python', ['start_app.py'], {
  stdio: 'inherit'
});

python.on('close', (code) => {
  console.log(`Python app exited with code ${code}`);
  process.exit(code);
});

python.on('error', (err) => {
  console.error('Error starting Python app:', err);
  process.exit(1);
});