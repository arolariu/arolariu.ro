import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

const meta = {
  title: "Components/Navigation/NavigationMenu",
  component: NavigationMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default navigation menu with dropdown content.
 */
export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid gap-3 p-6 w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]'>
              <li className='row-span-3'>
                <a
                  className='flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md'
                  href='/'>
                  <div className='mb-2 mt-4 text-lg font-medium'>arolariu/components</div>
                  <p className='text-sm leading-tight text-muted-foreground'>
                    Beautifully designed components built with Radix UI and Tailwind CSS.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs'>
                  <div className='text-sm font-medium leading-none'>Introduction</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    Re-usable components built using Radix UI and Tailwind CSS.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/installation'>
                  <div className='text-sm font-medium leading-none'>Installation</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    How to install dependencies and structure your app.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/primitives/typography'>
                  <div className='text-sm font-medium leading-none'>Typography</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    Styles for headings, paragraphs, lists...etc
                  </p>
                </a>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]'>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/primitives/alert-dialog'>
                  <div className='text-sm font-medium leading-none'>Alert Dialog</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    A modal dialog that interrupts the user with important content.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/primitives/hover-card'>
                  <div className='text-sm font-medium leading-none'>Hover Card</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    For sighted users to preview content available behind a link.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/primitives/progress'>
                  <div className='text-sm font-medium leading-none'>Progress</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    Displays an indicator showing the completion progress of a task.
                  </p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                  href='/docs/primitives/scroll-area'>
                  <div className='text-sm font-medium leading-none'>Scroll Area</div>
                  <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
                    Augments native scroll functionality for custom, cross-browser styling.
                  </p>
                </a>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/docs'>
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

/**
 * Simple navigation menu with direct links.
 */
export const SimpleLinks: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/'>
            Home
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/about'>
            About
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/services'>
            Services
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/contact'>
            Contact
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

/**
 * Navigation menu with mixed links and dropdowns.
 */
export const MixedNavigation: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/'>
            Home
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-[400px] gap-3 p-4'>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent'
                  href='/products/software'>
                  <div className='text-sm font-medium'>Software</div>
                  <p className='text-sm leading-snug text-muted-foreground'>Enterprise software solutions</p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent'
                  href='/products/hardware'>
                  <div className='text-sm font-medium'>Hardware</div>
                  <p className='text-sm leading-snug text-muted-foreground'>Physical products and devices</p>
                </a>
              </li>
              <li>
                <a
                  className='block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent'
                  href='/products/services'>
                  <div className='text-sm font-medium'>Services</div>
                  <p className='text-sm leading-snug text-muted-foreground'>Professional consulting services</p>
                </a>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            href='/pricing'>
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
