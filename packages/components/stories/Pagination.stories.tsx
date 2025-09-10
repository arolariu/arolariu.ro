import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {
  Button,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../dist";

const meta: Meta<typeof Pagination> = {
  title: "Design System/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Pagination Component**

Provides navigation controls (links, buttons) for browsing through paginated content, allowing users to jump between pages. Composed of several semantic sub-components.

**Core Components:**
*   \`<Pagination>\`: The root container component, typically a \`<nav>\` element with appropriate ARIA labeling (\`aria-label="pagination"\`).
*   \`<PaginationContent>\`: A container (\`<ul>\`) for the pagination items, usually using Flexbox for layout.
*   \`<PaginationItem>\`: A list item (\`<li>\`) wrapping each pagination element (link, ellipsis, button).
*   \`<PaginationLink>\`: An anchor tag (\`<a>\`) representing a link to a specific page. Accepts an \`isActive\` prop for styling the current page link. Can be used with routing libraries via the \`asChild\` prop. Often includes \`aria-current={isActive ? "page" : undefined}\`.
*   \`<PaginationPrevious>\`: A specialized \`<PaginationLink>\` component (usually rendering an anchor tag) for navigating to the previous page. Typically contains a "Previous" label and/or icon.
*   \`<PaginationNext>\`: A specialized \`<PaginationLink>\` component (usually rendering an anchor tag) for navigating to the next page. Typically contains a "Next" label and/or icon.
*   \`<PaginationEllipsis>\`: Represents one or more omitted page links (\`<span>\`), often used when there are many pages. Typically renders an ellipsis character ('...').

**Key Features:**
*   **Semantic Structure**: Uses \`nav\`, \`ul\`, \`li\` for accessibility and SEO.
*   **Accessibility**: Includes ARIA attributes (\`aria-label\`, \`aria-current\`) for screen reader support. Active links clearly indicate the current page. Previous/Next links provide clear navigation cues.
*   **Composable**: Allows flexible arrangement of page links, previous/next buttons, and ellipsis indicators.
*   **Styling**: Uses Tailwind CSS utility classes for styling links, buttons, and the active state.

See the [shadcn/ui Pagination documentation](https://ui.shadcn.com/docs/components/pagination) for more details and examples. Note that this component primarily provides the UI structure; the logic for handling page changes, total page counts, and generating links needs to be implemented separately based on the application's state management and routing.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Pagination>;

// Basic pagination
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "Displays a basic pagination setup with previous/next buttons and a few page links. The active page is highlighted.",
      },
    },
  },
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

// Pagination with ellipsis
export const WithEllipsis: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates pagination with ellipsis (...) to indicate omitted page numbers, useful for navigating large sets of pages.",
      },
    },
  },
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
          <PaginationLink href='#'>10</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

// Pagination with custom item count
export const CustomItemCount: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to dynamically generate a specific number of pagination links based on the total number of pages.",
      },
    },
  },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href='#' />
        </PaginationItem>
        {Array.from({length: 7}).map((_, i) => (
          <PaginationItem key={i}>
            <PaginationLink
              href='#'
              isActive={i === 3}>
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

// Disabled pagination items
export const DisabledItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates how pagination controls (like the 'Previous' button) can be disabled, typically when navigating to the first or last page.",
      },
    },
  },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href='#'
            isDisabled
          />
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
          <PaginationLink href='#'>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href='#' />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};

// Interactive pagination
export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Provides a fully interactive pagination example using React state to manage the current page. It uses `Button` components for navigation instead of `PaginationLink` and demonstrates conditional rendering of page numbers and ellipsis.",
      },
    },
  },
  render: function InteractivePagination() {
    const [currentPage, setCurrentPage] = React.useState(4);
    const totalPages = 10;

    const handlePageChange = (page: number) => {
      setCurrentPage(page);
    };

    return (
      <div className='space-y-4'>
        <div className='text-center'>
          <p>Current Page: {currentPage}</p>
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant='outline'
                size='icon'
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='h-9 w-9'>
                <span className='sr-only'>Go to previous page</span>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='lucide lucide-chevron-left h-4 w-4'>
                  <polyline points='15 18 9 12 15 6'></polyline>
                </svg>
              </Button>
            </PaginationItem>

            {currentPage > 2 && (
              <PaginationItem>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handlePageChange(1)}
                  className='h-9 w-9'>
                  1
                </Button>
              </PaginationItem>
            )}

            {currentPage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {currentPage > 1 && (
              <PaginationItem>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handlePageChange(currentPage - 1)}
                  className='h-9 w-9'>
                  {currentPage - 1}
                </Button>
              </PaginationItem>
            )}

            <PaginationItem>
              <Button
                variant='outline'
                size='icon'
                className='h-9 w-9 bg-neutral-100 dark:bg-neutral-800'
                disabled>
                {currentPage}
              </Button>
            </PaginationItem>

            {currentPage < totalPages && (
              <PaginationItem>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handlePageChange(currentPage + 1)}
                  className='h-9 w-9'>
                  {currentPage + 1}
                </Button>
              </PaginationItem>
            )}

            {currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {currentPage < totalPages - 1 && (
              <PaginationItem>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handlePageChange(totalPages)}
                  className='h-9 w-9'>
                  {totalPages}
                </Button>
              </PaginationItem>
            )}

            <PaginationItem>
              <Button
                variant='outline'
                size='icon'
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className='h-9 w-9'>
                <span className='sr-only'>Go to next page</span>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='lucide lucide-chevron-right h-4 w-4'>
                  <polyline points='9 18 15 12 9 6'></polyline>
                </svg>
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  },
};

// Compact pagination (mobile friendly)
export const Compact: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Presents a compact layout suitable for smaller screens. It allows items to wrap and displays the current page context ('Page X of Y').",
      },
    },
  },
  render: () => (
    <Pagination>
      <PaginationContent className='flex-wrap'>
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
      <div className='text-muted-foreground mt-4 text-center text-sm'>Page 2 of 10</div>
    </Pagination>
  ),
};

// Custom styled pagination
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates applying custom CSS classes to pagination components for unique styling, overriding the default appearance.",
      },
    },
  },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href='#'
            className='border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300'
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            className='border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300'>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            isActive
            className='border-blue-600 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-100'>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href='#'
            className='border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300'>
            3
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href='#'
            className='border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:text-blue-300'
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
