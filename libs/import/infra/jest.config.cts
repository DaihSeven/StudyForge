module.exports = {
  displayName: 'import-infra',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  // Testes de integração (banco real) rodam só pelo target `test-integration`
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.spec\\.ts$'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/import/infra'
};
