module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testRegex: '(test|spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: false,
  verbose: false,
};
