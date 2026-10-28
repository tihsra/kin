import { spawn } from 'node:child_process';

const processes = ['dev:api', 'dev:web'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit' }),
);
function stop(signal = 'SIGTERM') {
  for (const child of processes) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of processes)
  child.on('exit', (code) => {
    stop();
    process.exitCode = code || 0;
  });
