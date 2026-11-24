import { spawn } from 'child_process';

console.log('[Dev] Starting NTORQ Companion Server & Client...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['--workspace=server', 'run', 'dev'], { stdio: 'inherit' });
const client = spawn(npmCmd, ['--workspace=client', 'run', 'dev'], { stdio: 'inherit' });

function cleanup() {
  server.kill();
  client.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
