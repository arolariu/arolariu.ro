/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 *
 * @format
 */

import type {Config} from "jest";
import nextJest from "next/jest";

const nextConfig = nextJest({
  dir: "./",
});

const config: Config = {
  automock: false,
  maxWorkers: "75%",
  slowTestThreshold: 5,
  testEnvironment: "jsdom",
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  verbose: true,
  bail: 0,
  clearMocks: true,
  collectCoverage: true,
  // todo: collectCoverageFrom
  coverageDirectory: "code-cov/jest-report",
  coverageProvider: "v8",
  coverageReporters: ["html", "text", "json-summary", "lcov", "clover", "cobertura"],
  coverageThreshold: {
    global: {
      // todo: up to 95% after fixing all tests
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default nextConfig(config);
