'use strict';

// ts-jest config for the test suite. Tests live in test/ (outside src/) and
// import the app from ../src, so we give ts-jest its own TypeScript settings
// that drop the build's rootDir restriction (which would otherwise reject the
// out-of-src test files). This is type-checking/transpile only — it never emits
// to disk, so it can't interfere with `tsc`'s build of src/ into dist/.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  testTimeout: 10000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2021',
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          lib: ['ES2021'],
        },
      },
    ],
  },
};
