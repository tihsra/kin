// Run the API and worker together on one Render Free web service.
// Both processes stop while Render suspends the idle service.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let stopping = false;
let shutdownTimer;

function stop(code, signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill(signal);
  if (children.size) {
    shutdownTimer = setTimeout(() => {
      for (const child of children) child.kill('SIGKILL');
    }, 12000);
    shutdownTimer.unref();
  }
}

function launch(name, persistent = false) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--env-file-if-exists=.env', `apps/api/dist/${name}.js`],
      { cwd: root, stdio: 'inherit', env: process.env },
    );
    children.add(child);
    child.once('error', (error) => {
      console.error(`Cannot start ${name}: ${error.message}`);
      stop(1);
    });
    child.once('close', (code, signal) => {
      children.delete(child);
      if (!children.size) clearTimeout(shutdownTimer);
      if (!stopping && (persistent || code !== 0)) {
        console.error(`${name} stopped (${signal || code}); stopping the service.`);
        stop(code || 1);
      }
      resolve(code);
    });
  });
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => stop(0, signal));
}

// Free services do not support a Render preDeployCommand. Migrations must
// succeed before either process starts; the migrator already serializes runs.
await launch('migrate');
if (!stopping) {
  await Promise.all([launch('server', true), launch('worker', true)]);
}
