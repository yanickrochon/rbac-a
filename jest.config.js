module.exports = {
   verbose: true,
   globals: {
      "NODE_ENV": "test"
   },
   clearMocks: true,
   coverageDirectory: "coverage",
   coverageReporters: [
      "text-summary",
      "lcov"
   ],
   testEnvironment: "node",
   transform: {
      "^.+\\.js$": "babel-jest"
   },
   moduleFileExtensions: [
      "js"
   ],
   moduleDirectories: [
      "node_modules",
      "lib"
   ],
   roots: [
      "test"
   ]
};
