import { app } from './app.ts';
import { config } from './config.ts';
import { db } from './lib/db.ts';

const server = app.listen(config.PORT, config.HOST, () =>
  console.log(`Kin API listening on http://${config.HOST}:${config.PORT}`),
);
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    server.close(async () => {
      await db.end();
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
