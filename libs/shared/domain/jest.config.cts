module.exports = {
  displayName: 'shared-domain',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
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
  coverageDirectory: '../../../coverage/libs/shared/domain'
};
