/** Authored runtime measured independently of test imports. */
export const statusCoverageScope = {
  include: ["src/**/*.{js,ts,svelte}", "scripts/**/*.ts"],
  exclude: [
    "**/node_modules/**",
    "**/{generated,__generated__}/**",
    "**/*.generated.{js,ts,svelte}",
    "**/*.d.ts",
    "**/*.{test,spec,stories,config,setup}.{js,ts,svelte}",
    "**/{__mocks__,__fixtures__}/**",
    "src/routes/+layout.ts",
    "src/routes/+page.ts",
  ],
};
