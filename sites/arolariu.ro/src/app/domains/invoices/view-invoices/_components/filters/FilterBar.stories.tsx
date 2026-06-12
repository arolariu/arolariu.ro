"use client";

import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {seedInvoiceStoryStores, resetInvoiceStoryStores} from "../../../_storybook";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import FilterBar from "./FilterBar";

/**
 * FilterBar provides advanced filtering controls for the invoice list.
 *
 * This story mounts the real FilterBar component with a harness that manages
 * FilterState using useState and seeds the invoice store.
 */
const meta = {
	title: "Invoices/ViewInvoices/FilterBar",
	component: FilterBar,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Advanced filtering control bar for invoice list views. Provides search input, date range picker, amount range filter, " +
					"category/payment type/currency selectors, sort controls, and table/grid view toggle. Displays active filter count badge " +
					"and filtered result count. Mounted with real component wrapped in state harness with seeded invoice store.",
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
		(filters.search ? 1 : 0) +
		(filters.dateFrom ? 1 : 0) +
		(filters.dateTo ? 1 : 0) +
		(filters.amountMin !== null ? 1 : 0) +
		(filters.amountMax !== null ? 1 : 0) +
		filters.categories.length +
		filters.paymentTypes.length +
		filters.currencies.length;

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
					"Default state with no active filters applied. Shows clean search input, all dropdown selectors at default values, " +
					"default sort (date descending), and table view mode selected. Active filter count badge is hidden (0 filters).",
			},
		},
	},
	render: () => <FilterBarHarness initialFilters={{}} />,
};

/**
 * With active search query.
 */
export const WithActiveSearch: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Filter bar with active search query 'Grocery' applied. Demonstrates search input populated with user query, " +
					"active filter count badge showing 1 active filter, and filtered results count displayed.",
			},
		},
	},
	render: () => <FilterBarHarness initialFilters={{search: "Grocery"}} />,
};
