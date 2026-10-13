"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
import styles from "./pagination.module.css";

const meta = {
  title: "Components/Navigation/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default pagination with numbered pages.
 */
export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * Pagination with ellipsis for large page counts.
 */
export const WithEllipsis: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>10</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * Simple pagination with only prev/next buttons.
 */
export const SimplePrevNext: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * Pagination showing many pages with ellipsis on both sides.
 */
export const ExtendedRange: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>4</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            isActive>
            5
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>6</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>20</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

/**
 * Compact pagination with fewer visible page numbers.
 */
function CompactPagination(): React.JSX.Element {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href='#'>8</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export const Compact: Story = {
  render: () => <CompactPagination />,
};

/**
 * Pagination showing items-per-page selector.
 */
function PaginationWithPageSize(): React.JSX.Element {
  const [pageSize, setPageSize] = React.useState("10");
  const pageSizeId = React.useId();

  return (
    <div className={styles.storyStack}>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href='#' />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href='#'
              isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href='#'>3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href='#' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <div className={styles.storyPageSize}>
        <label htmlFor={pageSizeId}>Items per page:</label>
        <select
          id={pageSizeId}
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}>
          <option value='10'>10</option>
          <option value='25'>25</option>
          <option value='50'>50</option>
          <option value='100'>100</option>
        </select>
      </div>
    </div>
  );
}

export const WithPageSize: Story = {
  render: () => <PaginationWithPageSize />,
};

export const LocalizedRightToLeft: Story = {
  render: (): React.JSX.Element => (
    <Pagination
      dir='rtl'
      aria-label='Pages de résultats'>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href='?page=1'
            text='Précédent'
            aria-label='Page précédente'
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='?page=2'
            isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href='?page=3'
            text='Suivant'
            aria-label='Page suivante'
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

export const AllSizes: Story = {
  render: (): React.JSX.Element => (
    <Pagination aria-label='Page size examples'>
      <PaginationContent>
        {(["xs", "sm", "default", "lg", "icon-xs", "icon-sm", "icon", "icon-lg"] as const).map((size, index) => (
          <PaginationItem key={size}>
            <PaginationLink
              href={`?page=${index + 1}`}
              size={size}
              aria-label={`Page ${index + 1}, ${size}`}>
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  ),
};
