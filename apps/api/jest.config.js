module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/app.js'],
  setupFilesAfterEach: ['<rootDir>/tests/setup.js'],
  coverageDirectory: 'coverage',
  verbose: true,
};
