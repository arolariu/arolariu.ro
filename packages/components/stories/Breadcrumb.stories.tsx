import type {Meta, StoryObj} from "@storybook/react";
import {FileIcon, FolderIcon, HomeIcon} from "lucide-react";
import {Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator} from "../dist";

const meta: Meta<typeof Breadcrumb> = {
  title: "Design System/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Breadcrumb Component**

Provides navigational context, showing the user's path through a hierarchical structure (e.g., website pages, file system). Composed of several sub-components for structure and semantics.

**Core Components:**
*   \`<Breadcrumb>\`: The root container component, typically a \`<nav>\` element with appropriate ARIA labeling (\`aria-label="breadcrumb"\`).
*   \`<BreadcrumbList>\`: An ordered list (\`<ol>\`) wrapping the breadcrumb items.
*   \`<BreadcrumbItem>\`: A list item (\`<li>\`) representing a single step in the path.
*   \`<BreadcrumbLink>\`: An anchor tag (\`<a>\`) used for clickable links to parent pages or sections. Often used within \`<BreadcrumbItem>\`. Can be used with routing libraries via the \`asChild\` prop.
*   \`<BreadcrumbPage>\`: A span (\`<span>\`) representing the current page or location in the hierarchy. Typically the last item and not interactive. Includes \`aria-current="page"\` for accessibility.
*   \`<BreadcrumbSeparator>\`: A decorative element (usually a list item \`<li>\` with \`role="presentation"\`) displayed between breadcrumb items. Defaults to a forward slash icon but can be customized.
*   \`<BreadcrumbEllipsis>\`: Represents one or more collapsed items, often used in responsive designs to shorten long paths. Typically renders an ellipsis icon and might be interactive (e.g., within a dropdown) in more complex implementations.

**Key Features:**
*   Semantic HTML structure (\`nav\`, \`ol\`, \`li\`) for accessibility and SEO.
*   Uses ARIA attributes (\`aria-label\`, \`aria-current\`) for screen reader support.
*   Flexible composition allows for icons, custom separators, and responsive collapsing patterns.

See the [shadcn/ui Breadcrumb documentation](https://ui.shadcn.com/docs/components/breadcrumb) for more details and examples.
        `,
      },
    },
  },
  // Note: Most props are on the sub-components.
};

export default meta;

type Story = StoryObj<typeof Breadcrumb>;

// Basic breadcrumb
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A standard breadcrumb trail showing navigation hierarchy with links and the current page.",
      },
    },
  },
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href='/'>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Category</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// With icons
export const WithIcons: Story = {
  parameters: {
    docs: {
      description: {
        story: "Breadcrumb items can include icons alongside text for better visual representation.",
      },
    },
  },
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href='/'>
            <HomeIcon className='size-4' />
            <span>Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href='/documents'>
            <FolderIcon className='size-4' />
            <span>Documents</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            <FileIcon className='size-4' />
            <span>report.pdf</span>
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// With ellipsis for long paths
export const WithEllipsis: Story = {
  parameters: {
    docs: {
      description: {
        story: "Uses \`<BreadcrumbEllipsis>\` to shorten long breadcrumb trails, often used in responsive designs to save space.",
      },
    },
  },
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href='/'>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href='/products/electronics/computers'>Computers</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Laptops</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// Custom separator
export const CustomSeparator: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates replacing the default separator (slash) with custom content or styling within \`<BreadcrumbSeparator>\`.",
      },
    },
  },
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href='/'>Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className='text-blue-500'>
          {/* Custom separator using a forward slash */}
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className='text-blue-500'>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Category</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// Responsive breadcrumb
export const Responsive: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows a common pattern for responsive breadcrumbs, collapsing intermediate items into an ellipsis on smaller screens.",
      },
    },
  },
  render: () => (
    <div className='space-y-4'>
      <div>
        <p className='mb-1 text-sm font-medium'>Mobile view (collapsed)</p>
        <div className='max-w-[250px]'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>
                  <HomeIcon className='size-4' />
                  <span className='sr-only'>Home</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Current Page</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div>
        <p className='mb-1 text-sm font-medium'>Desktop view (expanded)</p>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href='/'>
                <HomeIcon className='size-4' />
                <span className='ml-1 hidden sm:inline-block'>Home</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href='/products'>Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href='/products/electronics'>Electronics</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Accessories</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  ),
};

// Custom styled
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Example of applying custom styles (background, text colors, etc.) to the breadcrumb components.",
      },
    },
  },
  render: () => (
    <Breadcrumb>
      <BreadcrumbList className='rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950/30'>
        <BreadcrumbItem>
          <BreadcrumbLink
            href='/'
            className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'>
            <HomeIcon className='size-4' />
            <span className='ml-1'>Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className='text-blue-400'>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink
            href='/products'
            className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'>
            Products
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className='text-blue-400'>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className='font-medium text-blue-900 dark:text-blue-200'>Category</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
