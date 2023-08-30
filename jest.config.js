const config = {
  coverageDirectory: 'coverage',
  collectCoverage: true,
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\\.([jt]sx?|mjs)$': 'babel-jest',
  },
  coveragePathIgnorePatterns: ['/node_modules/', 'test/'],
  testRegex: '\\.spec\\.tsx?$',
}

export default config
