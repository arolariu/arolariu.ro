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
  coverageDirectory: "jest-report",
  coverageProvider: "v8",
  coverageReporters: ["json", "text", "lcov", "clover"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default nextConfig(config);
