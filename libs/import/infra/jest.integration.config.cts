/** Testes de integração: gravam no banco de `DATABASE_URL` (carregado do `.env`). */
module.exports = {
  displayName: 'import-infra-integration',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
  setupFiles: ['dotenv/config'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testTimeout: 30000,
};
