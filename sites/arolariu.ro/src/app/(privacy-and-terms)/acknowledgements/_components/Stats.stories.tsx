import type {NodePackagesJSON} from "@/types";
import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import Stats from "./Stats";

faker.seed(42);

function createMockPackage(license: string) {
  return {
    name: `${faker.word.noun()}-${faker.string.alphanumeric(4)}`,
    version: faker.system.semver(),
    description: faker.lorem.sentence(),
    homepage: faker.internet.url(),
    license,
    author: faker.person.fullName(),
  };
}

const mockPackages: NodePackagesJSON = {
  production: [
    ...Array.from({length: 15}, () => createMockPackage("MIT")),
    ...Array.from({length: 5}, () => createMockPackage("Apache-2.0")),
    ...Array.from({length: 3}, () => createMockPackage("GPL-3.0")),
    ...Array.from({length: 2}, () => createMockPackage("ISC")),
  ],
  development: [
    ...Array.from({length: 10}, () => createMockPackage("MIT")),
    ...Array.from({length: 3}, () => createMockPackage("Apache")),
    ...Array.from({length: 1}, () => createMockPackage("GPL")),
    ...Array.from({length: 4}, () => createMockPackage("BSD-3-Clause")),
  ],
};

/**
 * Statistics dashboard for the Acknowledgements page.
 * Shows four metric cards: Total packages, Production dependencies,
 * Development dependencies, and MIT-licensed packages.
 * Uses the `Acknowledgements.stats` i18n namespace.
 */
const meta = {
  title: "Pages/Acknowledgements/Stats",
  component: Stats,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Stats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default statistics dashboard with four package metrics. */
export const Default: Story = {
  args: {
    packages: mockPackages,
  },
};
