const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  displayName: 'web',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.*',
    '!src/**/*.integration.spec.*',
    '!src/**/index.ts',
    '!src/**/*.module.ts',
    '!src/**/main.ts',
    '!src/**/dto/**',
    '!src/**/generated/**',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 }
  },
  coverageDirectory: '../../coverage/apps/web',
  testEnvironment: 'jsdom',
};

const jestConfig = createJestConfig(config);

module.exports = async () => {
  const resolved = await jestConfig();
  // Disable SWC path alias resolution — handled by Nx jest resolver.
  for (const value of Object.values(resolved.transform)) {
    if (Array.isArray(value) && value[1]?.resolvedBaseUrl) {
      value[1] = { ...value[1], resolvedBaseUrl: undefined };
    }
  }
  return resolved;
};
