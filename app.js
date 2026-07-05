// Phusion Passenger / Plesk Node.js entry point.
import { buildServer } from './src/server.js';
import { config } from './src/config.js';

const app = await buildServer();

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Football Forms app listening on ${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
