/**
 * Babel options live here (not in a babel.config.js) so they cannot leak into the
 * mobile app's Metro build, which compiles this package's source with babel-preset-expo.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts', '!src/testing.ts'],
  coverageThreshold: {
    global: { branches: 90, functions: 95, lines: 95, statements: 95 },
  },
};
