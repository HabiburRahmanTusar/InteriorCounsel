/**
 * Application entry point — starts the HTTP server.
 * Wiring only; no business logic here.
 */
require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase, disconnectDatabase } = require('./config/db');

async function start() {
  await connectDatabase(config.mongodbUri);

  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} [${config.env}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
