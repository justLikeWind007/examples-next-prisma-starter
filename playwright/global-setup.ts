import { execFileSync } from 'node:child_process';

export default function globalSetup() {
  const command =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm db-seed']
      : ['db-seed'];
  execFileSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
}
