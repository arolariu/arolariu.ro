import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {NodePackagesJSON} from "@/types";
import PackagesScreen from "./PackagesScreen";

faker.seed(42);

/** Generate a single mock package. */
function createMockPackage(isProduction: boolean) {
  const name = isProduction
    ? faker.helpers.arrayElement(["react", "next", "zustand", "motion", "clsx", "zod"])
    : faker.helpers.arrayElement(["eslint", "vitest", "typescript", "prettier", "@types/node", "storybook"]);
  return {
    name: `${name}-${faker.string.alphanumeric(4)}`,
    version: faker.system.semver(),
    description: faker.lorem.sentence(),
    homepage: faker.internet.url(),
    license: faker.helpers.arrayElement(["MIT", "Apache-2.0", "ISC"]),
    author: faker.person.fullName(),
    dependents: Array.from({length: faker.number.int({min: 0, max: 4})}, () => ({
      name: faker.word.noun(),
      version: faker.system.semver(),
    })),
  };
}

const mockPackages: NodePackagesJSON = {
  production: Array.from({length: 8}, () => createMockPackage(true)),
  development: Array.from({length: 6}, () => createMockPackage(false)),
};

/**
 * Packages screen with search, filters, grid/table views, and
 * a dependency dialog for each package. Requires `NodePackagesJSON` data.
 * Uses the `Acknowledgements.packagesScreen` i18n namespace.
 */
const meta = {
  title: "Pages/Acknowledgements/PackagesScreen",
  component: PackagesScreen,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PackagesScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with a mix of production and development packages. */
export const Default: Story = {
  args: {
    packages: mockPackages,
  },
};

/** Empty state when no packages are provided. */
export const EmptyPackages: Story = {
  args: {
    packages: {},
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    packages: mockPackages,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    packages: mockPackages,
  },
  parameters: {
    viewport: {defaultViewport: "xs"},
  },
};

/** XS viewport variant. */
export const XsViewport: Story = {
  args: {
    packages: mockPackages,
  },
  parameters: {
    viewport: {defaultViewport: "xs"},
  },
};

/** MD viewport variant. */
export const MdViewport: Story = {
  args: {
    packages: mockPackages,
  },
  parameters: {
    viewport: {defaultViewport: "md"},
  },
};
