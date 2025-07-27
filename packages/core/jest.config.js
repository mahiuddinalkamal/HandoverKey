module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@handoverkey/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testPathIgnorePatterns: ['/dist/'],
  coveragePathIgnorePatterns: ['/dist/', '/node_modules/'],
};