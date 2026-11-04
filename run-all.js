const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '   AegisPay Sentinel - Fullstack Runner');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Launch Backend
console.log('\x1b[32m%s\x1b[0m', '[STARTING] Backend on http://127.0.0.1:5000...');
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[34m[BACKEND]\x1b[0m ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[BACKEND ERROR]\x1b[0m ${data}`);
});

// 2. Launch Frontend
console.log('\x1b[32m%s\x1b[0m', '[STARTING] Frontend on http://localhost:5173...\n');
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'pipe',
  shell: true
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[35m[FRONTEND]\x1b[0m ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[FRONTEND ERROR]\x1b[0m ${data}`);
});

// Clean shutdown handler
const shutdown = () => {
  console.log('\n\x1b[33m%s\x1b[0m', '[STOPPING] Shutting down AegisPay Sentinel servers...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
