import { openDatabase } from './db/database.js';
import { createApp } from './app.js';
const db = openDatabase(process.env.DB_PATH);
const app = createApp(db, {
  readOnly: process.env.DEMO_READ_ONLY !== 'false',
  adminToken: process.env.ADMIN_TOKEN,
  origins: (
    process.env.ALLOWED_ORIGINS ??
    'http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081'
  ).split(','),
});
const host = process.env.HOST ?? '127.0.0.1',
  port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, host, () =>
  console.log(`Conecta API: http://${host}:${port} | dados simulados`),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
