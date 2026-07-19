/**
 * MongoDB connection lifecycle helpers.
 * No business logic — just connect / disconnect + event listeners.
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDatabase(uri, options = {}) {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', async () => {
    logger.info('MongoDB connected');
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: 'leavepolicies' }).toArray();
      if (collections.length > 0) {
        await db.collection('leavepolicies').dropIndex('employmentType_1');
        logger.info('Successfully dropped obsolete index employmentType_1 from leavepolicies');
      }
    } catch (err) {
      if (err.codeName !== 'IndexNotFound' && err.code !== 27) {
        logger.warn('Could not drop obsolete index employmentType_1:', err.message);
      }
    }
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', err);
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 10000,
    maxPoolSize: options.maxPoolSize || 50,
  });
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
