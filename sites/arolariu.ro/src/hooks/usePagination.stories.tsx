import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";
import {usePaginationWithSearch} from "./usePagination";

/**
 * The `usePaginationWithSearch` hook provides pagination state and controls
 * with integrated search filtering. This story renders a demo UI that
 * showcases pagination behavior with mock data.
 */
const meta = {
  title: "Site/usePagination",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Demo items for pagination. */
const ITEMS = Array.from({length: 23}, (_, i) => ({
  id: i + 1,
  name: `Item ${String(i + 1).padStart(2, "0")}`,
  category: ["Electronics", "Books", "Clothing", "Food", "Tools"][i % 5]!,
}));

/** Interactive pagination demo component. */
function PaginationDemo(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const {paginatedItems, currentPage, setCurrentPage, totalPages, pageSize, setPageSize, resetPagination} = usePaginationWithSearch({
    items: ITEMS,
    initialPageSize: 5,
    searchQuery: search,
  });

  return (
    <div className='w-[500px] space-y-4 rounded-lg border border-gray-200 p-6 dark:border-gray-700'>
      <h2 className='text-lg font-bold'>Pagination Demo</h2>

      {/* Search */}
      <input
        type='text'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search items...'
        className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800'
      />

      {/* Items list */}
      <ul className='space-y-1'>
        {paginatedItems.map((item) => (
          <li
            key={item.id}
            className='flex justify-between rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800'>
            <span className='font-medium'>{item.name}</span>
            <span className='text-gray-500 dark:text-gray-400'>{item.category}</span>
          </li>
        ))}
      </ul>

      {/* Controls */}
      <div className='flex items-center justify-between text-sm'>
        <span className='text-gray-500 dark:text-gray-400'>
          Page {currentPage} of {totalPages}
        </span>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className='rounded-md border px-3 py-1 disabled:opacity-50 dark:border-gray-600'>
            ← Prev
          </button>
          <button
            type='button'
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className='rounded-md border px-3 py-1 disabled:opacity-50 dark:border-gray-600'>
            Next →
          </button>
        </div>
      </div>

      {/* Page size */}
      <div className='flex items-center gap-3 text-sm'>
        <label htmlFor='page-size'>Items per page:</label>
        <select
          id='page-size'
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className='rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800'>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
        <button
          type='button'
          onClick={resetPagination}
          className='ml-auto text-blue-600 hover:underline dark:text-blue-400'>
          Reset
        </button>
      </div>
    </div>
  );
}

/** Default pagination demo with 23 items and search filter. */
export const Default: Story = {
  render: () => <PaginationDemo />,
};
