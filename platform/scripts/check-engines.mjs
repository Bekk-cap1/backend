const [majorNode] = process.versions.node.split('.').map(Number);
if (majorNode !== 22) {
  console.error(`Unsupported Node.js version ${process.versions.node}. Use Node 22.x`);
  process.exit(1);
}

const ua = process.env.npm_config_user_agent ?? '';
if (!ua.includes('pnpm/')) {
  console.error('Install dependencies with pnpm. Example: corepack pnpm install');
  process.exit(1);
}

const pnpmMatch = ua.match(/pnpm\/(\d+)\./);
if (!pnpmMatch) {
  console.error(`Cannot detect pnpm version from user agent: ${ua}`);
  process.exit(1);
}

const pnpmMajor = Number(pnpmMatch[1]);
if (pnpmMajor < 10 || pnpmMajor >= 11) {
  console.error(`Unsupported pnpm major version ${pnpmMajor}. Use pnpm 10.x`);
  process.exit(1);
}

console.log(`Engine check passed (node ${process.versions.node}, pnpm ${pnpmMajor}.x)`);
