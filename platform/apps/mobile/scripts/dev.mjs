import { Socket } from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_START_PORT = Number.parseInt(process.env.EXPO_DEV_PORT ?? '8081', 10);
const MAX_PORT = DEFAULT_START_PORT + 3;
const isWeb = process.argv.includes('--web');
const printPortOnly = process.argv.includes('--print-port');

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(120);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });
}

async function isPortAvailable(port) {
  const [ipv4Used, ipv6Used] = await Promise.all([
    canConnect(port, '127.0.0.1'),
    canConnect(port, '::1'),
  ]);
  return !ipv4Used && !ipv6Used;
}

async function findFreePort() {
  for (let port = DEFAULT_START_PORT; port <= MAX_PORT; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No free port found between ${DEFAULT_START_PORT} and ${MAX_PORT}. Set EXPO_DEV_PORT.`,
  );
}

function runExpo(port) {
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['expo', 'start', '--port', String(port), '--clear'];
  if (isWeb) {
    args.push('--web');
  }
  const command = `${npxBin} ${args.join(' ')}`;
  const child = spawn(command, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

console.log(
  `[mobile] Checking free Metro port in range ${DEFAULT_START_PORT}-${MAX_PORT}`,
);
const port = await findFreePort();
if (printPortOnly) {
  console.log(String(port));
  process.exit(0);
}
console.log(`[mobile] Starting Expo on port ${port}${isWeb ? ' (web)' : ''}`);
runExpo(port);
