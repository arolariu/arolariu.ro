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
    <div
      style={{
        width: "500px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        padding: "1.5rem",
      }}>
      <h2 style={{fontSize: "1.125rem", fontWeight: "700"}}>Pagination Demo</h2>

      {/* Search */}
      <input
        type='text'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search items...'
        style={{
          width: "100%",
          borderRadius: "0.375rem",
          border: "1px solid #d1d5db",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
          fontSize: "0.875rem",
        }}
      />

      {/* Items list */}
      <ul style={{display: "flex", flexDirection: "column", gap: "0.25rem"}}>
        {paginatedItems.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderRadius: "0.375rem",
              backgroundColor: "#f9fafb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
            }}>
            <span style={{fontWeight: "500"}}>{item.name}</span>
            <span style={{color: "#6b7280"}}>{item.category}</span>
          </li>
        ))}
      </ul>

      {/* Controls */}
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem"}}>
        <span style={{color: "#6b7280"}}>
          Page {currentPage} of {totalPages}
        </span>
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              backgroundColor: "transparent",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
            }}>
            ← Prev
          </button>
          <button
            type='button'
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              backgroundColor: "transparent",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}>
            Next →
          </button>
        </div>
      </div>

      {/* Page size */}
      <div style={{display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem"}}>
        <label htmlFor='page-size'>Items per page:</label>
        <select
          id='page-size'
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            paddingLeft: "0.5rem",
            paddingRight: "0.5rem",
            paddingTop: "0.25rem",
            paddingBottom: "0.25rem",
          }}>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
        <button
          type='button'
          onClick={resetPagination}
          style={{
            marginLeft: "auto",
            color: "#2563eb",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "none",
          }}>
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
