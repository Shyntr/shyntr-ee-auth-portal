import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override project tsconfig for test compilation only:
          // esnext modules and bundler resolution are not compatible with Jest's
          // CommonJS runner, so we use Node-compatible settings here.
          module: 'CommonJS',
          moduleResolution: 'node',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // setupFiles runs before the test framework and before module imports,
  // ensuring environment variables are set before any module-level code runs.
  setupFiles: ['<rootDir>/jest.setup.ts'],
};

export default config;
