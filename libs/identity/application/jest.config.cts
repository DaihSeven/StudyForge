module.exports = {
  displayName: 'identity-application',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  passWithNoTests: true, // ← Provisório: remover quando houver specs reais
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/identity/application'
};
