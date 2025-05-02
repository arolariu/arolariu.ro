import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  cn,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "../dist";

const meta: Meta<typeof NavigationMenu> = {
  title: "Design System/Navigation",
  component: NavigationMenu,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Navigation Menu Component**

Provides a structured and accessible way to build top-level navigation menus, often used in website headers, supporting dropdowns and complex layouts. Built upon the Radix UI Navigation Menu primitive.

**Core Components (from Radix UI):**
*   \`<NavigationMenu>\`: The root component managing state, context, and layout direction. Accepts props like \`value\`, \`defaultValue\`, \`onValueChange\`, \`orientation\`, \`dir\`, \`delayDuration\`, \`skipDelayDuration\`. Includes \`<NavigationMenuViewport>\` by default.
*   \`<NavigationMenuList>\`: The container (\`<ul>\`) for the top-level navigation items (\`<NavigationMenuItem>\`). Typically uses Flexbox for layout.
*   \`<NavigationMenuItem>\`: A list item (\`<li>\`) wrapping either a trigger (\`<NavigationMenuTrigger>\`) or a link (\`<NavigationMenuLink>\`).
*   \`<NavigationMenuTrigger>\`: An element (usually a button) that toggles the visibility of associated \`<NavigationMenuContent>\`. Includes a dropdown indicator icon. Styled using \`navigationMenuTriggerStyle\`. Handles ARIA attributes (\`aria-expanded\`, \`aria-controls\`).
*   \`<NavigationMenuContent>\`: The container (\`<div>\`) that appears when a trigger is activated. Holds the dropdown content (often structured with \`ul\`/\`li\` or custom components). Handles animation and positioning relative to the viewport or trigger.
*   \`<NavigationMenuLink>\`: A styled link component (\`<a>\`) for navigation. Can be used as a top-level item or within content. Includes styles for active states and interactions. Can integrate with routing libraries via \`asChild\`. Based on Radix UI Link.
*   \`<NavigationMenuIndicator>\`: A visual element (\`<div>\`), often an arrow, that moves to indicate the currently active trigger when its content is open. Positioned relative to the list. Can be animated.
*   \`<NavigationMenuViewport>\`: An absolutely positioned container (\`<div>\`) that wraps and positions all open \`<NavigationMenuContent>\` components, ensuring consistent alignment and animation. Can be disabled via the \`viewport\` prop on \`<NavigationMenu>\`.

**Helper Styles:**
*   \`navigationMenuTriggerStyle\`: A \`cva\` style function providing base styling for triggers and links intended to look like triggers.

**Key Features:**
*   **Accessibility**: Full keyboard navigation (Tab, Shift+Tab, Arrow keys, Enter, Space, Escape), focus management, and ARIA roles/attributes for menu structures.
*   **Hover/Focus Intent**: Uses delays (\`delayDuration\`, \`skipDelayDuration\`) to manage opening/closing based on user intent, preventing accidental activation.
*   **Flexible Layout**: Supports horizontal and vertical orientations. Content areas allow for complex layouts beyond simple lists.
*   **Viewport Positioning**: Ensures dropdown content remains visible within the browser viewport.

See the [shadcn/ui Navigation Menu documentation](https://ui.shadcn.com/docs/components/navigation-menu) and the [Radix UI Navigation Menu documentation](https://www.radix-ui.com/primitives/docs/components/navigation-menu) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"], // Add autodocs tag
};

export default meta;

type Story = StoryObj<typeof NavigationMenu>;

/**
 * A basic navigation menu with dropdowns for 'Getting started' and 'Components',
 * and a direct link for 'Documentation'.
 */
export const Basic: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <a
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-neutral-50 to-neutral-100 p-6 no-underline outline-none focus:shadow-md dark:from-neutral-900 dark:to-neutral-800"
                    href="/"
                  >
                    <div className="mb-2 mt-4 text-lg font-medium">
                      shadcn/ui
                    </div>
                    <p className="text-sm leading-tight text-neutral-600 dark:text-neutral-400">
                      Beautifully designed components built with Radix UI and
                      Tailwind CSS.
                    </p>
                  </a>
                </NavigationMenuLink>
              </li>
              <ListItem href="/docs" title="Introduction">
                Re-usable components built using Radix UI and Tailwind CSS.
              </ListItem>
              <ListItem href="/docs/installation" title="Installation">
                How to install dependencies and structure your app.
              </ListItem>
              <ListItem href="/docs/primitives/typography" title="Typography">
                Styles for headings, paragraphs, lists...etc
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href="https://github.com/shadcn/ui"
          >
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

// Horizontal navigation menu
export const Horizontal: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Home
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Products
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Services
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Blog
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Contact
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

// Navigation menu with indicator
export const WithIndicator: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Features</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
              <ListItem title="Analytics" href="#">
                Get detailed insights about your business.
              </ListItem>
              <ListItem title="Reporting" href="#">
                Generate comprehensive reports.
              </ListItem>
              <ListItem title="Automation" href="#">
                Automate your workflows.
              </ListItem>
              <ListItem title="Integrations" href="#">
                Connect with your favorite tools.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
              <ListItem title="Documentation" href="#">
                Read our comprehensive guides.
              </ListItem>
              <ListItem title="API Reference" href="#">
                Detailed API documentation.
              </ListItem>
              <ListItem title="Blog" href="#">
                Latest news and articles.
              </ListItem>
              <ListItem title="Support" href="#">
                Get help from our team.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            About
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuIndicator />
      <NavigationMenuViewport />
    </NavigationMenu>
  ),
};

// Custom styled navigation menu
export const CustomStyled: Story = {
  render: () => (
    <NavigationMenu className="bg-blue-50 p-2 rounded-lg dark:bg-blue-950">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800">
            Products
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 bg-white rounded-lg shadow-lg dark:bg-blue-900">
              <ListItem
                title="Product 1"
                href="#"
                className="text-blue-700 dark:text-blue-100"
              >
                Our flagship product with amazing features.
              </ListItem>
              <ListItem
                title="Product 2"
                href="#"
                className="text-blue-700 dark:text-blue-100"
              >
                The next generation of our solution.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800">
            Solutions
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 bg-white rounded-lg shadow-lg dark:bg-blue-900">
              <ListItem
                title="Enterprise"
                href="#"
                className="text-blue-700 dark:text-blue-100"
              >
                For large organizations with complex needs.
              </ListItem>
              <ListItem
                title="Small Business"
                href="#"
                className="text-blue-700 dark:text-blue-100"
              >
                Streamlined tools for growing businesses.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#"
            className="bg-white text-blue-700 px-4 py-2 rounded-md hover:bg-blue-50 hover:text-blue-800 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
          >
            Contact
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

// Mobile-friendly navigation menu
export const MobileFriendly: Story = {
  render: function MobileFriendlyNavigation() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div className="relative">
        <button
          className="md:hidden block p-2 bg-neutral-100 rounded-md dark:bg-neutral-800 mb-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>

        <NavigationMenu
          className={cn(
            "transition-all duration-200",
            isOpen ? "block" : "hidden md:block",
          )}
        >
          <NavigationMenuList className="flex-col md:flex-row space-y-2 md:space-y-0">
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="#"
              >
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-2 p-2 md:w-[400px] md:grid-cols-2 md:gap-4 md:p-4">
                  <ListItem title="Product 1" href="#">
                    Description of product 1
                  </ListItem>
                  <ListItem title="Product 2" href="#">
                    Description of product 2
                  </ListItem>
                  <ListItem title="Product 3" href="#">
                    Description of product 3
                  </ListItem>
                  <ListItem title="Product 4" href="#">
                    Description of product 4
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="#"
              >
                About
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href="#"
              >
                Contact
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport />
        </NavigationMenu>
      </div>
    );
  },
};

// ListItem component for NavigationMenuContent
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; className?: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800",
            className,
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-neutral-500 dark:text-neutral-400">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

// Sample component data for "Components" dropdown
const components = [
  {
    title: "Alert Dialog",
    href: "#",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    title: "Hover Card",
    href: "#",
    description:
      "For sighted users to preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "#",
    description:
      "Displays an indicator showing the completion progress of a task.",
  },
  {
    title: "Scroll Area",
    href: "#",
    description: "Visually or semantically separates content.",
  },
  {
    title: "Tabs",
    href: "#",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Tooltip",
    href: "#",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
];
