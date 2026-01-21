/**
 * @fileoverview Browser and device project configuration.
 * Provides consistent project definitions with device presets.
 * @module tests/config/projects
 */

/* eslint-disable no-console -- Config logging */

import {devices, type PlaywrightTestProject} from "@playwright/test";

import {getBaseURL, getEnvironment, isCI} from "./environment";

/** Simple debug check for config logging */
const isDebug = process.env["PLAYWRIGHT_DEBUG"] === "true" || process.env["DEBUG"] === "true";

/* eslint-disable no-magic-numbers -- Configuration uses explicit numeric values */

/** Device preset configuration */
export interface DevicePreset {
  /** Playwright device descriptor spread */
  readonly deviceDescriptor: (typeof devices)[keyof typeof devices];
  /** Optional launch options override */
  readonly launchOptions?: {
    readonly slowMo?: number;
  };
  /** Optional context options */
  readonly contextOptions?: {
    readonly permissions?: string[];
    readonly geolocation?: {latitude: number; longitude: number};
    readonly locale?: string;
    readonly timezoneId?: string;
  };
}

/**
 * Available device presets for testing.
 * Add new devices here to make them available project-wide.
 */
export const DEVICE_PRESETS = {
  // Desktop browsers
  "desktop-chrome": {
    deviceDescriptor: devices["Desktop Chrome"],
  },
  "desktop-firefox": {
    deviceDescriptor: devices["Desktop Firefox"],
  },
  "desktop-safari": {
    deviceDescriptor: devices["Desktop Safari"],
  },
  "desktop-edge": {
    deviceDescriptor: devices["Desktop Edge"],
  },

  // Mobile devices
  "mobile-iphone-14": {
    deviceDescriptor: devices["iPhone 14 Pro"],
  },
  "mobile-iphone-se": {
    deviceDescriptor: devices["iPhone SE"],
  },
  "mobile-pixel-7": {
    deviceDescriptor: devices["Pixel 7"],
  },
  "mobile-galaxy-s9": {
    deviceDescriptor: devices["Galaxy S9+"],
  },

  // Tablets
  "tablet-ipad": {
    deviceDescriptor: devices["iPad Pro 11"],
  },
  "tablet-ipad-mini": {
    deviceDescriptor: devices["iPad Mini"],
  },

  // Special configurations
  "slow-3g-chrome": {
    deviceDescriptor: devices["Desktop Chrome"],
    launchOptions: {
      slowMo: 100,
    },
  },
  "high-dpi-chrome": {
    deviceDescriptor: {
      ...devices["Desktop Chrome"],
      deviceScaleFactor: 2,
    },
  },
} as const satisfies Record<string, DevicePreset>;

/** Available preset names */
export type DevicePresetName = keyof typeof DEVICE_PRESETS;

/** Project creation options */
export interface CreateProjectOptions {
  /** Custom test match pattern */
  readonly testMatch?: string | string[];
  /** Custom test ignore pattern */
  readonly testIgnore?: string | string[];
  /** Custom timeout in milliseconds */
  readonly timeout?: number;
  /** Number of retries */
  readonly retries?: number;
  /** Additional use options */
  readonly use?: Record<string, unknown>;
  /** Project dependencies */
  readonly dependencies?: string[];
  /** Test directory */
  readonly testDir?: string;
}

/**
 * Create a Playwright project with consistent configuration.
 *
 * @param name - Unique project name
 * @param preset - Device preset to use
 * @param options - Additional project options
 * @returns Configured Playwright project
 *
 * @example
 * ```typescript
 * createProject('mobile-ios', 'mobile-iphone-14', { timeout: 120_000 })
 * ```
 */
export function createProject(name: string, preset: DevicePresetName, options?: CreateProjectOptions): PlaywrightTestProject {
  const devicePreset = DEVICE_PRESETS[preset];
  const baseURL = getBaseURL();

  return {
    name,
    use: {
      ...devicePreset.deviceDescriptor,
      ...(devicePreset.launchOptions && {launchOptions: devicePreset.launchOptions}),
      ...(devicePreset.contextOptions && devicePreset.contextOptions),
      baseURL,
      ignoreHTTPSErrors: true,
      ...options?.use,
    },
    timeout: options?.timeout ?? 90_000,
    retries: options?.retries,
    testMatch: options?.testMatch ?? "src/**/*.spec.{ts,tsx}",
    testIgnore: options?.testIgnore,
    testDir: options?.testDir,
    dependencies: options?.dependencies,
  };
}

/**
 * Project groups for different testing scenarios.
 */
export const PROJECT_GROUPS = {
  /** Minimal set for quick feedback */
  smoke: ["desktop-chrome"] as const,

  /** Core browsers for CI */
  ci: ["desktop-chrome", "desktop-firefox"] as const,

  /** Full desktop coverage */
  desktop: ["desktop-chrome", "desktop-firefox", "desktop-safari", "desktop-edge"] as const,

  /** Mobile device coverage */
  mobile: ["mobile-iphone-14", "mobile-pixel-7"] as const,

  /** Tablet device coverage */
  tablet: ["tablet-ipad"] as const,

  /** Complete cross-browser/device coverage */
  full: ["desktop-chrome", "desktop-firefox", "desktop-safari", "mobile-iphone-14", "mobile-pixel-7", "tablet-ipad"] as const,
} as const;

/**
 * Get projects based on a predefined group.
 *
 * @param group - Project group name
 * @returns Array of configured projects
 */
export function getProjectGroup(group: keyof typeof PROJECT_GROUPS): PlaywrightTestProject[] {
  const presets = PROJECT_GROUPS[group];
  return presets.map((preset) => createProject(`${preset}-e2e`, preset as DevicePresetName));
}

/**
 * Get projects appropriate for the current environment.
 * Automatically selects based on CI detection and environment variables.
 *
 * @returns Array of configured projects
 */
export function getProjectsForEnvironment(): PlaywrightTestProject[] {
  const env = getEnvironment();
  let projects: PlaywrightTestProject[];

  switch (env) {
    case "ci":
      // CI: Chrome + Firefox for balance of coverage and speed
      projects = [createProject("chromium-desktop-e2e", "desktop-chrome"), createProject("firefox-desktop-e2e", "desktop-firefox")];
      break;

    case "local-full":
      // Full local testing: All major browsers + mobile
      projects = [
        createProject("chromium-desktop-e2e", "desktop-chrome"),
        createProject("firefox-desktop-e2e", "desktop-firefox"),
        createProject("webkit-desktop-e2e", "desktop-safari"),
        createProject("mobile-iphone-e2e", "mobile-iphone-14"),
      ];
      break;

    case "staging":
    case "production":
      // Remote environments: Chrome only for stability
      projects = [createProject("chromium-desktop-e2e", "desktop-chrome")];
      break;

    case "local":
    default:
      // Default local: Chrome only for speed
      // Add more with TEST_ENV=local-full
      if (isCI()) {
        projects = [createProject("chromium-desktop-e2e", "desktop-chrome")];
      } else {
        // Local development: all browsers available
        projects = [
          createProject("chromium-desktop-e2e", "desktop-chrome"),
          createProject("firefox-desktop-e2e", "desktop-firefox"),
          createProject("webkit-desktop-e2e", "desktop-safari"),
        ];
      }
      break;
  }

  if (isDebug) {
    const projectNames = projects.map((p) => p.name).join(", ");
    console.log(`[CONFIG] Selected ${projects.length} project(s): ${projectNames}`);
  }

  return projects;
}

/**
 * Create a setup project that runs before other projects.
 * Useful for authentication state preparation.
 *
 * @param name - Project name
 * @param setupFile - Path to setup test file
 * @returns Configured setup project
 */
export function createSetupProject(name: string, setupFile: string): PlaywrightTestProject {
  return {
    name,
    testMatch: setupFile,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: getBaseURL(),
      ignoreHTTPSErrors: true,
    },
  };
}

/* eslint-enable no-magic-numbers, no-console */
