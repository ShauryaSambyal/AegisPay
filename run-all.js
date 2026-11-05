const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '   AegisPay Sentinel - Fullstack Runner');
console.log('\x1b[36m%s\x1b[0m', '   backend :5000  frontend :5173  ml :8001');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const children = [];
const stopAll = () => children.forEach(child => {
  try {
    if (!child.killed) child.kill('SIGINT');
  } catch {
    // process already gone
  }
});

const pipe = (child, label, color) => {
  child.stdout.on('data', data => process.stdout.write(`\x1b[${color}m[${label}]\x1b[0m ${data}`));
  child.stderr.on('data', data => process.stderr.write(`\x1b[31m[${label} ERROR]\x1b[0m ${data}`));
  child.on('exit', code => {
    if (code !== null && code !== 0) {
      console.error(`\x1b[31m[${label}]\x1b[0m exited with code ${code}`);
    }
  });
  children.push(child);
  return child;
};

// 1. ML service (Python 3.11 venv)
const mlPython = path.join(
  __dirname,
  'ml-service',
  '.venv',
  isWindows ? 'Scripts/python.exe' : 'bin/python'
);
console.log('\x1b[32m%s\x1b[0m', '[STARTING] ML service on http://127.0.0.1:8001 ...');
const ml = pipe(
  spawn(mlPython, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'], {
    cwd: path.join(__dirname, 'ml-service'),
    stdio: 'pipe',
    shell: false,
  }),
  'ML',
  '36'
);

// 2. Backend. PORT is pinned so an inherited PORT=0 in the parent shell cannot
// move the API off :5000 (dotenv does not override existing env vars).
console.log('\x1b[32m%s\x1b[0m', '[STARTING] Backend on http://127.0.0.1:5000 ...');
const backendPort = process.env.BACKEND_PORT || '5000';
const backend = pipe(
  spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: backendPort },
  }),
  'BACKEND',
  '34'
);

// 3. Frontend
console.log('\x1b[32m%s\x1b[0m', '[STARTING] Frontend on http://localhost:5173 ...\n');
const frontend = pipe(
  spawn(npmCmd, ['run', 'dev'], { cwd: path.join(__dirname, 'frontend'), stdio: 'pipe', shell: true }),
  'FRONTEND',
  '35'
);

// Wait for the ML service health endpoint so the proxy is useful immediately.
const probe = () =>
  new Promise(resolve => {
    const request = http.get('http://127.0.0.1:8001/health', response => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });

(async () => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await probe()) {
      console.log('\x1b[32m%s\x1b[0m', '[READY] ML service /health answered 200');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '[WARN] ML service did not answer /health within 20s. The frontend will show its offline state.'
  );
})();

// Shutdown: stop every child process tree we started.
const shutdown = () => {
  console.log('\n\x1b[33m%s\x1b[0m', '[STOPPING] Shutting down AegisPay Sentinel services...');
  stopAll();
  setTimeout(() => process.exit(0), 1500);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', stopAll);

void ml;
void backend;
void frontend;
