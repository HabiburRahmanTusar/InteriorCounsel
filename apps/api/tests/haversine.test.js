/**
 * Smoke tests for utility helpers.
 * Business-logic tests (attendance engine, RBAC, etc.) will be added per build plan §10.
 */
const { haversineDistance } = require('../src/utils/haversine');

describe('haversine distance', () => {
  test('returns 0 for identical points', () => {
    expect(haversineDistance(23.8103, 90.4125, 23.8103, 90.4125)).toBe(0);
  });

  test('returns positive distance for distinct points', () => {
    const d = haversineDistance(23.8103, 90.4125, 23.8105, 90.4127);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(100);
  });
});
