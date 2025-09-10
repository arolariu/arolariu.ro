import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {ScrollArea, ScrollBar} from "../dist";

const meta: Meta<typeof ScrollArea> = {
  title: "Design System/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Scroll Area Component**

Provides a styled scrollable container, enhancing the native browser scroll behavior with custom scrollbars. Built upon the Radix UI Scroll Area primitive.

**Core Components (from Radix UI):**
*   \`<ScrollArea>\`: The root component (\`<div>\`) that wraps the content to be scrolled. It establishes the scrollable viewport.
*   \`<ScrollAreaViewport>\`: (Used internally by shadcn/ui \`<ScrollArea>\`) The direct container (\`<div>\`) for the scrollable content.
*   \`<ScrollBar>\`: Represents the visual scrollbar track and thumb (\`<div>\`). Requires an \`orientation\` prop ('vertical' or 'horizontal').
*   \`<ScrollAreaThumb>\`: (Used internally by shadcn/ui \`<ScrollBar>\`) The draggable part (\`<div>\`) of the scrollbar.

**Key Features & Props:**
*   **Custom Scrollbars**: Replaces native browser scrollbars with themeable, consistently styled scrollbars (\`<ScrollBar>\`).
*   **Orientation**: Automatically displays vertical or horizontal scrollbars based on content overflow. The \`<ScrollBar>\` component explicitly requires the \`orientation\` prop.
*   **Accessibility**: Radix UI ensures the underlying primitives are accessible, although custom scrollbars can sometimes pose challenges compared to native ones.
*   **Styling**: Styled using Tailwind CSS. The appearance of the viewport, scrollbar track, and thumb can be customized via CSS classes.
*   **Composition**: Requires wrapping the content within \`<ScrollArea>\`. The \`<ScrollBar>\` component is placed as a direct child of \`<ScrollArea>\`.

See the [shadcn/ui Scroll Area documentation](https://ui.shadcn.com/docs/components/scroll-area) and the [Radix UI Scroll Area documentation](https://www.radix-ui.com/primitives/docs/components/scroll-area) for more details.
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      options: ["vertical", "horizontal", "both"],
      control: {type: "radio"},
      description: "The scroll direction of the scroll area",
      defaultValue: "vertical",
    },
    className: {control: "text"},
    children: {control: {disable: true}},
  },
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  args: {
    className: "h-[200px] w-[350px] rounded-md border p-4",
  },
  parameters: {
    docs: {
      description: {
        story: "A basic ScrollArea containing long content that requires scrolling. A default styled scrollbar appears when needed.",
      },
    },
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className='space-y-4'>
        <h4 className='text-sm leading-none font-medium'>Vertical Scrolling Example</h4>
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          This is a vertical scrolling area with default settings. The content will scroll vertically when it overflows.
        </p>
        {Array.from({length: 20}).map((_, i) => (
          <div
            key={i}
            className='rounded-md border p-4'>
            <div className='font-semibold'>Item {i + 1}</div>
            <p className='text-sm text-neutral-500'>This is item number {i + 1} in the scrollable content.</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates a ScrollArea configured for horizontal scrolling, suitable for wide content like images or tables.",
      },
    },
  },
  render: () => (
    <ScrollArea className='w-96 rounded-md border whitespace-nowrap'>
      <div className='flex p-4'>
        {Array.from({length: 50}).map((_, i) => (
          <div
            key={i}
            className='mr-4 flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-md border'>
            <span className='font-semibold'>Item {i + 1}</span>
          </div>
        ))}
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};

export const VerticalAndHorizontal: Story = {
  render: () => (
    <ScrollArea className='h-72 w-96 rounded-md border'>
      <div className='p-4'>
        <h4 className='mb-4 text-sm leading-none font-medium'>Both Scrollbars Example</h4>
        <div className='flex flex-nowrap'>
          {Array.from({length: 50}).map((_, i) => (
            <div
              key={i}
              className='mr-4 mb-4 flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-md border'>
              <span className='font-semibold'>Item {i + 1}</span>
            </div>
          ))}
        </div>
        <p className='mt-4 text-sm text-neutral-500 dark:text-neutral-400'>
          {Array.from({length: 20}).map((_, i) => (
            <React.Fragment key={i}>
              This is additional vertical content in the scroll area. <br />
            </React.Fragment>
          ))}
        </p>
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};

export const NestedScrollAreas: Story = {
  render: () => (
    <ScrollArea className='h-96 w-96 rounded-md border p-4'>
      <div className='space-y-4'>
        <h4 className='text-sm leading-none font-medium'>Nested Scroll Areas</h4>
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          This example demonstrates nested scroll areas with different orientations.
        </p>
        <div className='space-y-4'>
          {Array.from({length: 5}).map((_, i) => (
            <div
              key={i}
              className='rounded-md border p-4'>
              <h5 className='mb-2 text-sm font-medium'>Section {i + 1}</h5>
              <ScrollArea className='h-32 w-full rounded-md border border-neutral-200 dark:border-neutral-800'>
                <div className='flex p-4'>
                  {Array.from({length: 15}).map((_, j) => (
                    <div
                      key={j}
                      className='mr-4 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border'>
                      <span className='text-xs font-medium'>Item {j + 1}</span>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation='horizontal' />
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
};

export const CustomScrollbar: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to apply custom styles to the ScrollBar component within the ScrollArea.",
      },
    },
  },
  render: () => (
    <div className='space-y-4'>
      <h4 className='text-sm font-medium'>Custom Scrollbar Styling</h4>
      <ScrollArea className='h-[300px] w-[400px] rounded-md border'>
        <div className='space-y-4 p-4'>
          <h4 className='text-sm leading-none font-medium'>Custom Scrollbar Example</h4>
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            This example shows the scroll area with custom styling applied to the scrollbar.
          </p>
          {Array.from({length: 30}).map((_, i) => (
            <div
              key={i}
              className='rounded-md border p-4'>
              <div className='font-semibold'>Item {i + 1}</div>
              <p className='text-sm text-neutral-500'>Scroll content with custom scrollbar appearance.</p>
            </div>
          ))}
        </div>
        <style
          jsx
          global>{`
          [data-slot="scroll-area-thumb"] {
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 9999px;
          }
          .dark [data-slot="scroll-area-thumb"] {
            background-color: rgba(255, 255, 255, 0.3);
          }
          [data-slot="scroll-area-thumb"]:hover {
            background-color: rgba(0, 0, 0, 0.5);
          }
          .dark [data-slot="scroll-area-thumb"]:hover {
            background-color: rgba(255, 255, 255, 0.5);
          }
        `}</style>
      </ScrollArea>
    </div>
  ),
};

export const WithContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates a ScrollArea constrained to a fixed height and width, forcing scrollbars to appear if the content exceeds these dimensions.",
      },
    },
  },
  render: () => (
    <ScrollArea className='h-[400px] w-[600px] rounded-md border'>
      <div className='p-6'>
        <h2 className='mb-4 text-2xl font-bold'>Lorem Ipsum</h2>
        <p className='mb-4 text-neutral-600 dark:text-neutral-300'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
          enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <h3 className='mt-6 mb-2 text-xl font-semibold'>Section 1</h3>
        <p className='mb-4 text-neutral-600 dark:text-neutral-300'>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
          cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        <div className='mb-6 rounded-md border bg-neutral-50 p-4 dark:bg-neutral-900'>
          <h4 className='mb-2 font-medium'>Example Code Block</h4>
          <pre className='overflow-x-auto rounded bg-neutral-100 p-2 text-sm dark:bg-neutral-800'>
            <code>
              {`function example() {
  const value = "This is a code example";
  console.log(value);
  return value.length;
}`}
            </code>
          </pre>
        </div>
        <h3 className='mt-6 mb-2 text-xl font-semibold'>Section 2</h3>
        <p className='mb-4 text-neutral-600 dark:text-neutral-300'>
          Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus,
          omnis voluptas assumenda est, omnis dolor repellendus.
        </p>
        <ul className='mb-4 list-disc pl-6 text-neutral-600 dark:text-neutral-300'>
          {Array.from({length: 5}).map((_, i) => (
            <li
              key={i}
              className='mb-2'>
              List item {i + 1} with some example text that might be useful in a documentation page.
            </li>
          ))}
        </ul>
        <h3 className='mt-6 mb-2 text-xl font-semibold'>Section 3</h3>
        <p className='mb-4 text-neutral-600 dark:text-neutral-300'>
          Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil
          impedit quo minus id quod maxime placeat facere.
        </p>
        {Array.from({length: 3}).map((_, i) => (
          <div
            key={i}
            className='mb-4 rounded-md border p-4'>
            <h4 className='mb-2 font-medium'>Card Example {i + 1}</h4>
            <p className='text-neutral-500 dark:text-neutral-400'>This is a card component that showcases content within the ScrollArea.</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
