"use client";

import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores} from "../../../_storybook";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import FilterBar from "./FilterBar";

/**
 * FilterBar provides advanced filtering controls for the invoice list.
 *
 * This story mounts the real FilterBar component with a harness that manages
 * FilterState using useState and seeds the invoice store.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/FilterBar",
  component: FilterBar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Advanced filtering control bar for invoice list views. Provides search input, date range picker, amount range filter, "
          + "category/payment type/currency selectors, sort controls, and table/grid view toggle. Displays active filter count badge "
          + "and filtered result count. Mounted with real component wrapped in state harness with seeded invoice store.",
      },
    },
  },
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores();
      return <Story />;
    },
  ],
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Harness component to manage FilterState with useState.
 *
 * @param props - Component props.
 * @param props.initialFilters - Initial filter state.
 * @returns FilterBar wrapped with state management.
 */
function FilterBarHarness({
  initialFilters,
}: Readonly<{
  initialFilters: Partial<FilterState>;
}>): React.JSX.Element {
  const defaultFilters: FilterState = {
    search: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    categories: [],
    paymentTypes: [],
    currencies: [],
    sortBy: "date",
    sortOrder: "desc",
    view: "table",
    ...initialFilters,
  };

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [viewMode, setViewMode] = useState<"table" | "grid">(defaultFilters.view);

  const handleFiltersChange = (newFilters: Partial<FilterState>): void => {
    setFilters((prev) => ({...prev, ...newFilters}));
  };

  // Count active filters (excluding defaults)
  const activeFilterCount =
    (filters.search ? 1 : 0)
    + (filters.dateFrom ? 1 : 0)
    + (filters.dateTo ? 1 : 0)
    + (filters.amountMin !== null ? 1 : 0)
    + (filters.amountMax !== null ? 1 : 0)
    + filters.categories.length
    + filters.paymentTypes.length
    + filters.currencies.length;

  return (
    <div style={{maxWidth: "1200px"}}>
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        activeFilterCount={activeFilterCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filteredCount={3}
      />
    </div>
  );
}

/**
 * Default state — no active filters.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default state with no active filters applied. Shows clean search input, all dropdown selectors at default values, "
          + "default sort (date descending), and table view mode selected. Active filter count badge is hidden (0 filters).",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: () => {},
    activeFilterCount: 0,
    viewMode: "table",
    onViewModeChange: () => {},
    filteredCount: 3,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/**
 * With active search query.
 */
export const WithActiveSearch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Filter bar with active search query 'Grocery' applied. Demonstrates search input populated with user query, "
          + "active filter count badge showing 1 active filter, and filtered results count displayed.",
      },
    },
  },
  args: {
    filters: {
      search: "Grocery",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: () => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: () => {},
    filteredCount: 3,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/**
 * With multiple active filters (4 filters applied).
 */
export const MultipleActiveFilters: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Filter bar with 4 active filters: search query, date range, category, and payment type. Tests active filter count badge and complex filter state rendering.",
      },
    },
  },
  args: {
    filters: {
      search: "Mega Image",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      amountMin: null,
      amountMax: null,
      categories: [100],
      paymentTypes: [1],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: () => {},
    activeFilterCount: 4,
    viewMode: "table",
    onViewModeChange: () => {},
    filteredCount: 5,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/**
 * Grid view mode selected.
 */
export const GridViewMode: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with grid view mode active. Tests view toggle state rendering and mode switching behavior.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "grid",
    },
    onFiltersChange: () => {},
    activeFilterCount: 0,
    viewMode: "grid",
    onViewModeChange: () => {},
    filteredCount: 3,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/**
 * With amount range filter.
 */
export const WithAmountRange: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with amount range filter applied (50-200 RON). Tests numeric range filter rendering and active filter count.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: 50,
      amountMax: 200,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "amount",
      sortOrder: "asc",
      view: "table",
    },
    onFiltersChange: () => {},
    activeFilterCount: 2,
    viewMode: "table",
    onViewModeChange: () => {},
    filteredCount: 8,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/**
 * With date range only.
 */
export const WithDateRange: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with date range filter applied (January 2024). Tests date picker state and date range display.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: () => {},
    activeFilterCount: 2,
    viewMode: "table",
    onViewModeChange: () => {},
    filteredCount: 12,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With many active filters (7 filters) — max complexity state. */
export const ManyActiveFilters: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Filter bar with 7 active filters: search, date range, amount range, category, payment type, currency, and custom sort. Tests complex filter state rendering and count badge with high filter count.",
      },
    },
  },
  args: {
    filters: {
      search: "Carrefour",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      amountMin: 20,
      amountMax: 500,
      categories: [100, 200],
      paymentTypes: [1, 2],
      currencies: ["RON", "EUR"],
      sortBy: "amount",
      sortOrder: "asc",
      view: "grid",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 7,
    viewMode: "grid",
    onViewModeChange: (): void => {},
    filteredCount: 18,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With currency filter only. */
export const WithCurrencyFilter: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with currency selector filter applied (EUR, USD). Tests multi-currency filtering and currency dropdown state.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: ["EUR", "USD"],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 2,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 22,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With category filter only — single dimension filtering. */
export const WithCategoryFilter: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with single category filter applied. Tests category selector state and single-dimension filtering.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [100],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 8,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With payment type filter only. */
export const WithPaymentTypeFilter: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with payment type filter applied (cash payments). Tests payment type selector and filtering behavior.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [1],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 15,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** Sort by amount ascending — non-default sort. */
export const SortByAmountAscending: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with amount-based ascending sort. Tests sort control rendering with non-default sort criteria.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "amount",
      sortOrder: "asc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 0,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 3,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With minimal amount range (min only). */
export const WithMinAmountOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with only minimum amount filter set (no maximum). Tests partial numeric range filtering.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: 100,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "amount",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 6,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With search and date range combined. */
export const SearchAndDateRange: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with search query and date range combined. Tests compound text and temporal filtering.",
      },
    },
  },
  args: {
    filters: {
      search: "Kaufland",
      dateFrom: "2024-06-01",
      dateTo: "2024-06-30",
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 3,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 4,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** With max amount only (no minimum). */
export const WithMaxAmountOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with only maximum amount filter set (no minimum). Tests upper-bound-only numeric filtering.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: 50,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "amount",
      sortOrder: "asc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 9,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** Multiple categories selected. */
export const MultipleCategoriesSelected: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with multiple categories selected. Tests multi-select category filtering.",
      },
    },
  },
  args: {
    filters: {
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [100, 200, 300],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 3,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 14,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** Grid view with active filters. */
export const GridViewWithFilters: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar in grid view mode with active search filter. Tests view mode + filtering combination.",
      },
    },
  },
  args: {
    filters: {
      search: "Lidl",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "grid",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "grid",
    onViewModeChange: (): void => {},
    filteredCount: 7,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};

/** Zero filtered results. */
export const ZeroResults: Story = {
  parameters: {
    docs: {
      description: {
        story: "Filter bar with filters applied but zero results. Tests empty result state rendering.",
      },
    },
  },
  args: {
    filters: {
      search: "NonexistentMerchant",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
      view: "table",
    },
    onFiltersChange: (): void => {},
    activeFilterCount: 1,
    viewMode: "table",
    onViewModeChange: (): void => {},
    filteredCount: 0,
  },
  render: (args) => <FilterBarHarness initialFilters={args.filters} />,
};
