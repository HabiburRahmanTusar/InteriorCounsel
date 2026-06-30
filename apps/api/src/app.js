/**
 * Express application wiring — middleware chain + route mounting.
 * No business logic; handlers live in controllers.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();

// --- Security & utility middleware ---
app.use(helmet());

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4300',
  'http://192.168.0.141:4300',
  'http://192.168.0.141:4200',
  'http://localhost:58922',
];

if (config.corsOrigin) {
  const origins = config.corsOrigin.split(',').map((o) => o.trim());
  allowedOrigins.push(...origins);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: config.env });
});

// --- API routes ---
app.use('/api', routes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// --- Central error handler (must be last) ---
app.use(errorHandler);

module.exports = app;
