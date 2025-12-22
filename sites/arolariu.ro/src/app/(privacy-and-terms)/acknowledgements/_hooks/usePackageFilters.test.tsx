/**
 * @fileoverview Unit tests for the usePackageFilters custom hook.
 * @module usePackageFilters.test
 *
 * @remarks
 * Tests cover:
 * - Initial state values
 * - Search filtering by package name and dependents
 * - Package type filtering (production, development, all)
 * - Sorting by name, dependencies count, and type
 * - Sort direction toggling
 * - Edge cases (empty data, no matches, special characters)
 * - Memoization behavior
 */

import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {act, renderHook} from "@testing-library/react";
import {describe, expect, test} from "vitest";
import {usePackageFilters} from "./usePackageFilters";

// ============================================================================
// Test Data Fixtures
// ============================================================================

/**
 * Creates a minimal package for testing.
 */
function createPackage(name: string, overrides?: Partial<NodePackageInformation>): NodePackageInformation {
  return {
    name,
    version: "1.0.0",
    description: `Description for ${name}`,
    homepage: `https://example.com/${name}`,
    license: "MIT",
    author: "Test Author",
    ...overrides,
  };
}

const reactPackage = createPackage("react", {
  version: "19.2.0",
  description: "React library for building user interfaces",
  dependents: [
    {name: "react-dom", version: "19.2.0"},
    {name: "react-router", version: "7.0.0"},
  ],
});

const nextPackage = createPackage("next", {
  version: "16.0.0",
  description: "Next.js framework",
  dependents: [{name: "next-intl", version: "4.0.0"}],
});

const eslintPackage = createPackage("eslint", {
  version: "9.0.0",
  description: "JavaScript linter",
  dependents: [
    {name: "eslint-plugin-react", version: "7.0.0"},
    {name: "eslint-plugin-import", version: "2.0.0"},
    {name: "eslint-config-next", version: "15.0.0"},
  ],
});

const typescriptPackage = createPackage("typescript", {
  version: "5.9.0",
  description: "TypeScript language",
});

const prettierPackage = createPackage("prettier", {
  version: "3.6.0",
  description: "Code formatter",
  dependents: [{name: "prettier-plugin-tailwindcss", version: "1.0.0"}],
});

const zustandPackage = createPackage("zustand", {
  version: "5.0.0",
  description: "State management",
});

const samplePackages: NodePackagesJSON = {
  production: [reactPackage, nextPackage, zustandPackage],
  development: [eslintPackage, typescriptPackage, prettierPackage],
};

const emptyPackages: NodePackagesJSON = {};

const productionOnlyPackages: NodePackagesJSON = {
  production: [reactPackage, nextPackage],
};

const developmentOnlyPackages: NodePackagesJSON = {
  development: [eslintPackage, typescriptPackage],
};

// ============================================================================
// Test Suites
// ============================================================================

describe("usePackageFilters", () => {
  describe("initial state", () => {
    test("returns empty search query initially", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.searchQuery).toBe("");
    });

    test("returns 'name' as default sort field", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.sortField).toBe("name");
    });

    test("returns 'asc' as default sort direction", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.sortDirection).toBe("asc");
    });

    test("returns 'all' as default package type", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.packageType).toBe("all");
    });

    test("returns all packages when no filters applied", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.filteredAndSortedPackages).toHaveLength(6);
    });

    test("returns empty array for empty packages", () => {
      const {result} = renderHook(() => usePackageFilters(emptyPackages));
      expect(result.current.filteredAndSortedPackages).toHaveLength(0);
    });
  });

  describe("search filtering", () => {
    test("filters packages by name (case-insensitive)", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("zustand");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(1);
      expect(result.current.filteredAndSortedPackages[0]?.name).toBe("zustand");
    });

    test("filters packages by uppercase search query", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("ZUSTAND");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(1);
      expect(result.current.filteredAndSortedPackages[0]?.name).toBe("zustand");
    });

    test("filters packages by partial name match", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("script");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(1);
      expect(result.current.filteredAndSortedPackages[0]?.name).toBe("typescript");
    });

    test("filters packages by dependent name", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("react-dom");
      });

      // Should find react because it has react-dom as a dependent
      expect(result.current.filteredAndSortedPackages).toHaveLength(1);
      expect(result.current.filteredAndSortedPackages[0]?.name).toBe("react");
    });

    test("returns multiple matches", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("e");
      });

      // All packages contain 'e' in their name
      expect(result.current.filteredAndSortedPackages.length).toBeGreaterThan(1);
    });

    test("returns empty array when no matches found", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("nonexistent-package");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(0);
    });

    test("clears filter when search query is cleared", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("zustand");
      });
      expect(result.current.filteredAndSortedPackages).toHaveLength(1);

      act(() => {
        result.current.setSearchQuery("");
      });
      expect(result.current.filteredAndSortedPackages).toHaveLength(6);
    });

    test("handles special characters in search query", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("@");
      });

      // No packages have @ in their name
      expect(result.current.filteredAndSortedPackages).toHaveLength(0);
    });
  });

  describe("package type filtering", () => {
    test("filters to production packages only", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setPackageType("production");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(3);
      result.current.filteredAndSortedPackages.forEach((pkg) => {
        expect(result.current.extractPackageType(pkg)).toBe("production");
      });
    });

    test("filters to development packages only", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setPackageType("development");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(3);
      result.current.filteredAndSortedPackages.forEach((pkg) => {
        expect(result.current.extractPackageType(pkg)).toBe("development");
      });
    });

    test("shows all packages when type is 'all'", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setPackageType("production");
      });
      expect(result.current.filteredAndSortedPackages).toHaveLength(3);

      act(() => {
        result.current.setPackageType("all");
      });
      expect(result.current.filteredAndSortedPackages).toHaveLength(6);
    });

    test("combines package type filter with search query", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("e");
        result.current.setPackageType("production");
      });

      // Only production packages that contain 'e' in name
      result.current.filteredAndSortedPackages.forEach((pkg) => {
        expect(pkg.name.toLowerCase()).toContain("e");
        expect(result.current.extractPackageType(pkg)).toBe("production");
      });
    });
  });

  describe("extractPackageType", () => {
    test("identifies production packages", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.extractPackageType(reactPackage)).toBe("production");
      expect(result.current.extractPackageType(nextPackage)).toBe("production");
    });

    test("identifies development packages", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      expect(result.current.extractPackageType(eslintPackage)).toBe("development");
      expect(result.current.extractPackageType(typescriptPackage)).toBe("development");
    });

    test("returns 'all' for unknown packages", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));
      const unknownPackage = createPackage("unknown-package");
      expect(result.current.extractPackageType(unknownPackage)).toBe("all");
    });

    test("works with production-only packages", () => {
      const {result} = renderHook(() => usePackageFilters(productionOnlyPackages));
      expect(result.current.extractPackageType(reactPackage)).toBe("production");
      expect(result.current.extractPackageType(eslintPackage)).toBe("all");
    });

    test("works with development-only packages", () => {
      const {result} = renderHook(() => usePackageFilters(developmentOnlyPackages));
      expect(result.current.extractPackageType(eslintPackage)).toBe("development");
      expect(result.current.extractPackageType(reactPackage)).toBe("all");
    });
  });

  describe("sorting by name", () => {
    test("sorts packages alphabetically ascending by default", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      const names = result.current.filteredAndSortedPackages.map((p) => p.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
    });

    test("sorts packages alphabetically descending", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortDirection("desc");
      });

      const names = result.current.filteredAndSortedPackages.map((p) => p.name);
      const sortedNames = [...names].sort((a, b) => b.localeCompare(a));

      expect(names).toEqual(sortedNames);
    });
  });

  describe("sorting by dependencies count", () => {
    test("sorts by dependency count ascending", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("dependencies");
        result.current.setSortDirection("asc");
      });

      const packages = result.current.filteredAndSortedPackages;
      for (let i = 1; i < packages.length; i++) {
        const prev = packages[i - 1]?.dependents?.length ?? 0;
        const curr = packages[i]?.dependents?.length ?? 0;
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    test("sorts by dependency count descending", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("dependencies");
        result.current.setSortDirection("desc");
      });

      const packages = result.current.filteredAndSortedPackages;
      for (let i = 1; i < packages.length; i++) {
        const prev = packages[i - 1]?.dependents?.length ?? 0;
        const curr = packages[i]?.dependents?.length ?? 0;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    test("packages without dependents are treated as having 0", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("dependencies");
        result.current.setSortDirection("asc");
      });

      // Packages without dependents should be first in ascending order
      const firstPackage = result.current.filteredAndSortedPackages[0];
      expect(firstPackage?.dependents?.length ?? 0).toBe(0);
    });
  });

  describe("sorting by type", () => {
    test("sorts production packages first in ascending order", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("type");
        result.current.setSortDirection("asc");
      });

      const packages = result.current.filteredAndSortedPackages;
      const types = packages.map((p) => result.current.extractPackageType(p));

      // All production packages should come before development packages
      const firstDevIndex = types.indexOf("development");
      const lastProdIndex = types.lastIndexOf("production");

      if (firstDevIndex !== -1 && lastProdIndex !== -1) {
        expect(lastProdIndex).toBeLessThan(firstDevIndex);
      }
    });

    test("sorts development packages first in descending order", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("type");
        result.current.setSortDirection("desc");
      });

      const packages = result.current.filteredAndSortedPackages;
      const types = packages.map((p) => result.current.extractPackageType(p));

      // All development packages should come before production packages
      const firstProdIndex = types.indexOf("production");
      const lastDevIndex = types.lastIndexOf("development");

      if (firstProdIndex !== -1 && lastDevIndex !== -1) {
        expect(lastDevIndex).toBeLessThan(firstProdIndex);
      }
    });
  });

  describe("state setters", () => {
    test("setSearchQuery updates search query", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("test");
      });

      expect(result.current.searchQuery).toBe("test");
    });

    test("setSortField updates sort field", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortField("dependencies");
      });

      expect(result.current.sortField).toBe("dependencies");
    });

    test("setSortDirection updates sort direction", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSortDirection("desc");
      });

      expect(result.current.sortDirection).toBe("desc");
    });

    test("setPackageType updates package type", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setPackageType("production");
      });

      expect(result.current.packageType).toBe("production");
    });
  });

  describe("combined filters and sorting", () => {
    test("applies search, type filter, and sorting together", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("e");
        result.current.setPackageType("production");
        result.current.setSortField("name");
        result.current.setSortDirection("desc");
      });

      const packages = result.current.filteredAndSortedPackages;

      // All should contain 'e' and be production
      packages.forEach((pkg) => {
        expect(pkg.name.toLowerCase()).toContain("e");
        expect(result.current.extractPackageType(pkg)).toBe("production");
      });

      // Should be sorted descending by name
      for (let i = 1; i < packages.length; i++) {
        const prev = packages[i - 1]?.name ?? "";
        const curr = packages[i]?.name ?? "";
        expect(prev.localeCompare(curr)).toBeGreaterThanOrEqual(0);
      }
    });

    test("changing one filter preserves others", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("react");
        result.current.setPackageType("production");
        result.current.setSortDirection("desc");
      });

      expect(result.current.searchQuery).toBe("react");
      expect(result.current.packageType).toBe("production");
      expect(result.current.sortDirection).toBe("desc");

      act(() => {
        result.current.setSortField("dependencies");
      });

      // Other filters should be preserved
      expect(result.current.searchQuery).toBe("react");
      expect(result.current.packageType).toBe("production");
      expect(result.current.sortDirection).toBe("desc");
      expect(result.current.sortField).toBe("dependencies");
    });
  });

  describe("edge cases", () => {
    test("handles packages with undefined dependents array", () => {
      const packagesWithUndefinedDependents: NodePackagesJSON = {
        production: [
          createPackage("pkg-with-dependents", {dependents: [{name: "dep1", version: "1.0.0"}]}),
          createPackage("pkg-without-dependents"),
        ],
      };

      const {result} = renderHook(() => usePackageFilters(packagesWithUndefinedDependents));

      act(() => {
        result.current.setSortField("dependencies");
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(2);
    });

    test("handles empty production array", () => {
      const packagesWithEmptyProd: NodePackagesJSON = {
        production: [],
        development: [eslintPackage],
      };

      const {result} = renderHook(() => usePackageFilters(packagesWithEmptyProd));
      expect(result.current.filteredAndSortedPackages).toHaveLength(1);
    });

    test("handles packages with only peer dependencies", () => {
      const peerOnlyPackages: NodePackagesJSON = {
        peer: [createPackage("peer-package-1"), createPackage("peer-package-2")],
      };

      const {result} = renderHook(() => usePackageFilters(peerOnlyPackages));
      expect(result.current.filteredAndSortedPackages).toHaveLength(2);
    });

    test("handles packages in multiple categories gracefully", () => {
      // Same package name in both production and development
      const duplicatePackages: NodePackagesJSON = {
        production: [createPackage("shared-package", {version: "1.0.0"})],
        development: [createPackage("shared-package", {version: "2.0.0"})],
      };

      const {result} = renderHook(() => usePackageFilters(duplicatePackages));

      // Note: Set uses reference equality, so both objects will be included
      // This is expected behavior based on the current implementation
      expect(result.current.filteredAndSortedPackages.length).toBeGreaterThanOrEqual(1);
    });

    test("handles very long search queries", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("a".repeat(1000));
      });

      expect(result.current.filteredAndSortedPackages).toHaveLength(0);
    });

    test("handles search with leading/trailing spaces", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      act(() => {
        result.current.setSearchQuery("  react  ");
      });

      // Current implementation doesn't trim, so this should find nothing
      expect(result.current.filteredAndSortedPackages).toHaveLength(0);
    });
  });

  describe("return value immutability", () => {
    test("returns readonly object", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      // TypeScript enforces Readonly, but we can verify the structure
      expect(result.current.filteredAndSortedPackages).toBeInstanceOf(Array);
      expect(typeof result.current.extractPackageType).toBe("function");
    });

    test("returns new array reference on filter change", () => {
      const {result} = renderHook(() => usePackageFilters(samplePackages));

      const initialArray = result.current.filteredAndSortedPackages;

      act(() => {
        result.current.setSearchQuery("react");
      });

      const newArray = result.current.filteredAndSortedPackages;
      expect(initialArray).not.toBe(newArray);
    });
  });

  describe("hook stability", () => {
    test("extractPackageType function is memoized", () => {
      const {result, rerender} = renderHook(() => usePackageFilters(samplePackages));

      const initialExtract = result.current.extractPackageType;

      rerender();

      // Function reference should be stable if packages haven't changed
      expect(result.current.extractPackageType).toBe(initialExtract);
    });

    test("extractPackageType updates when packages change", () => {
      const {result, rerender} = renderHook(({packages}: {packages: NodePackagesJSON}) => usePackageFilters(packages), {
        initialProps: {packages: samplePackages},
      });

      const initialExtract = result.current.extractPackageType;

      rerender({packages: productionOnlyPackages});

      // Function reference should change when packages change
      expect(result.current.extractPackageType).not.toBe(initialExtract);
    });
  });
});
