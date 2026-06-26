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
  await connectDatabase(config.mongodbUri, config.mongodb);

  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} [${config.env}]`);
  });

  // Start daily payroll evaluation scheduler
  const automationService = require('./services/automation.service');
  automationService
    .evaluateAllActive()
    .then(() => logger.info('Startup automation evaluation completed'))
    .catch((err) => logger.error('Startup automation evaluation failed', err));

  const intervalId = setInterval(
    () => {
      automationService
        .evaluateAllActive()
        .then(() => logger.info('Scheduled automation evaluation completed'))
        .catch((err) => logger.error('Scheduled automation evaluation failed', err));
    },
    12 * 60 * 60 * 1000,
  ); // 12 hours

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    clearInterval(intervalId);
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
