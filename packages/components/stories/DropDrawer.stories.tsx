import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  DropDrawer,
  DropDrawerTrigger,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  Button,
} from "../dist";
import {
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  CreditCardIcon,
  CloudIcon,
  GlobeIcon,
  BellIcon,
  MenuIcon,
  LifeBuoyIcon,
  ShieldIcon,
  KeyIcon,
  SmartphoneIcon,
  ComputerIcon,
} from "lucide-react";

const meta: Meta<typeof DropDrawer> = {
  title: "Design System/DropDrawer",
  component: DropDrawer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**DropDrawer Component**

A responsive component that adapts between a dropdown menu on desktop and a drawer on mobile devices. This component offers a unified API to create consistent navigation and menu experiences across different screen sizes.

**Core Components:**
*   \`<DropDrawer>\`: The root component that decides between Drawer and DropdownMenu based on device.
*   \`<DropDrawerTrigger>\`: The element that opens the dropdown or drawer.
*   \`<DropDrawerContent>\`: Container for the menu items that appears as a popover on desktop or slides in as a drawer on mobile.
*   \`<DropDrawerItem>\`: Individual clickable menu option.
*   \`<DropDrawerLabel>\`: Text label to group or describe menu sections.
*   \`<DropDrawerSeparator>\`: Visual divider between menu items or sections.
*   \`<DropDrawerGroup>\`: Groups related menu items together.
*   \`<DropDrawerFooter>\`: Container for content at the bottom of the menu.
*   \`<DropDrawerSub>\`: Creates a nested submenu.
*   \`<DropDrawerSubTrigger>\`: Element that opens a submenu.
*   \`<DropDrawerSubContent>\`: Container for submenu items.

**Key Features:**
*   **Responsive Design**: Automatically switches between dropdown (desktop) and drawer (mobile) based on screen size.
*   **Unified API**: Same component structure works across both mobile and desktop views.
*   **Submenus**: Support for nested menu items with smooth animation transitions on mobile.
*   **Grouping**: Ability to visually group related menu items.
*   **Accessibility**: Built on top of accessible Radix UI primitives.
`,
      },
    },
  },
  argTypes: {
    children: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof DropDrawer>;

// Basic story with simple menu items
export const Basic: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropDrawerTrigger>
      <DropDrawerContent>
        <DropDrawerLabel>My Account</DropDrawerLabel>
        <DropDrawerItem>
          <UserIcon className="mr-2 h-4 w-4" />
          Profile
        </DropDrawerItem>
        <DropDrawerItem>
          <SettingsIcon className="mr-2 h-4 w-4" />
          Settings
        </DropDrawerItem>
        <DropDrawerSeparator />
        <DropDrawerItem variant="destructive">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </DropDrawerItem>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A basic implementation of the DropDrawer component with simple menu items.",
      },
    },
  },
};

// With groups of items
export const WithGroups: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button variant="outline">
          <MenuIcon className="mr-2 h-4 w-4" />
          Menu with Groups
        </Button>
      </DropDrawerTrigger>
      <DropDrawerContent className="w-56">
        <DropDrawerLabel>Account</DropDrawerLabel>
        <DropDrawerGroup>
          <DropDrawerItem>
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </DropDrawerItem>
          <DropDrawerItem>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Billing
          </DropDrawerItem>
          <DropDrawerItem>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </DropDrawerItem>
        </DropDrawerGroup>
        <DropDrawerSeparator />
        <DropDrawerLabel>Support</DropDrawerLabel>
        <DropDrawerGroup>
          <DropDrawerItem>
            <LifeBuoyIcon className="mr-2 h-4 w-4" />
            Help Center
          </DropDrawerItem>
          <DropDrawerItem>
            <BellIcon className="mr-2 h-4 w-4" />
            Notifications
          </DropDrawerItem>
        </DropDrawerGroup>
        <DropDrawerSeparator />
        <DropDrawerItem variant="destructive">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </DropDrawerItem>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story: "DropDrawer with grouped items for better organization.",
      },
    },
  },
};

// With nested submenus
export const WithSubmenus: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button variant="outline">
          <MenuIcon className="mr-2 h-4 w-4" />
          Menu with Submenus
        </Button>
      </DropDrawerTrigger>
      <DropDrawerContent className="w-56">
        <DropDrawerLabel>Account</DropDrawerLabel>
        <DropDrawerItem>
          <UserIcon className="mr-2 h-4 w-4" />
          Profile
        </DropDrawerItem>
        <DropDrawerSeparator />

        <DropDrawerSub>
          <DropDrawerSubTrigger>
            <ShieldIcon className="mr-2 h-4 w-4" />
            Security
          </DropDrawerSubTrigger>
          <DropDrawerSubContent>
            <DropDrawerItem>
              <KeyIcon className="mr-2 h-4 w-4" />
              Password
            </DropDrawerItem>
            <DropDrawerItem>
              <SmartphoneIcon className="mr-2 h-4 w-4" />
              Two-factor Auth
            </DropDrawerItem>
          </DropDrawerSubContent>
        </DropDrawerSub>

        <DropDrawerSub>
          <DropDrawerSubTrigger>
            <CloudIcon className="mr-2 h-4 w-4" />
            Cloud Services
          </DropDrawerSubTrigger>
          <DropDrawerSubContent>
            <DropDrawerItem>
              <GlobeIcon className="mr-2 h-4 w-4" />
              CDN
            </DropDrawerItem>
            <DropDrawerItem>
              <ComputerIcon className="mr-2 h-4 w-4" />
              Hosting
            </DropDrawerItem>
            <DropDrawerSub>
              <DropDrawerSubTrigger>
                <DatabaseIcon className="mr-2 h-4 w-4" />
                Databases
              </DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem>SQL</DropDrawerItem>
                <DropDrawerItem>NoSQL</DropDrawerItem>
                <DropDrawerItem>Graph</DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerSubContent>
        </DropDrawerSub>

        <DropDrawerSeparator />
        <DropDrawerItem>
          <SettingsIcon className="mr-2 h-4 w-4" />
          Settings
        </DropDrawerItem>
        <DropDrawerItem variant="destructive">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </DropDrawerItem>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "DropDrawer with multi-level nested submenus, showcasing the nested navigation capability.",
      },
    },
  },
};

// With footer
export const WithFooter: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button variant="outline">Menu with Footer</Button>
      </DropDrawerTrigger>
      <DropDrawerContent className="w-56">
        <DropDrawerLabel>Navigation</DropDrawerLabel>
        <DropDrawerItem>Dashboard</DropDrawerItem>
        <DropDrawerItem>Projects</DropDrawerItem>
        <DropDrawerItem>Team</DropDrawerItem>
        <DropDrawerSeparator />
        <DropDrawerItem>Settings</DropDrawerItem>
        <DropDrawerFooter>
          <Button className="w-full">New Project</Button>
        </DropDrawerFooter>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story: "DropDrawer with a footer section containing action buttons.",
      },
    },
  },
};

// Mobile drawer variant
export const MobileDrawerVariant: Story = {
  render: () => {
    return (
      <DropDrawer>
        <DropDrawerTrigger asChild>
          <Button variant="outline">Open Mobile Menu</Button>
        </DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerLabel>Mobile Navigation</DropDrawerLabel>
          <DropDrawerItem>
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </DropDrawerItem>
          <DropDrawerGroup>
            <DropDrawerItem>
              <BellIcon className="mr-2 h-4 w-4" />
              Notifications
            </DropDrawerItem>
            <DropDrawerItem>
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropDrawerItem>
          </DropDrawerGroup>
          <DropDrawerSeparator />
          <DropDrawerSub>
            <DropDrawerSubTrigger>
              <CloudIcon className="mr-2 h-4 w-4" />
              Services
            </DropDrawerSubTrigger>
            <DropDrawerSubContent>
              <DropDrawerItem>Storage</DropDrawerItem>
              <DropDrawerItem>Compute</DropDrawerItem>
              <DropDrawerItem>Analytics</DropDrawerItem>
            </DropDrawerSubContent>
          </DropDrawerSub>
          <DropDrawerFooter>
            <Button variant="destructive" className="w-full">
              <LogOutIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </DropDrawerFooter>
        </DropDrawerContent>
      </DropDrawer>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Demonstration of the DropDrawer in mobile mode where it renders as a drawer instead of a dropdown.",
      },
    },
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

// With different variants for items
export const ItemVariants: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button variant="outline">Item Variants</Button>
      </DropDrawerTrigger>
      <DropDrawerContent className="w-56">
        <DropDrawerLabel>Item Variants</DropDrawerLabel>
        <DropDrawerItem>Default Item</DropDrawerItem>
        <DropDrawerItem variant="destructive">Destructive Item</DropDrawerItem>
        <DropDrawerItem inset>Inset Item (Indented)</DropDrawerItem>
        <DropDrawerItem disabled>Disabled Item</DropDrawerItem>
        <DropDrawerItem icon={<BellIcon className="h-4 w-4" />}>
          With Icon on Right
        </DropDrawerItem>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Showcasing the different variants and styles available for DropDrawerItem.",
      },
    },
  },
};

// Complex example combining multiple features
export const ComplexExample: Story = {
  render: () => (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <Button>
          <MenuIcon className="mr-2 h-4 w-4" />
          Complete Menu
        </Button>
      </DropDrawerTrigger>
      <DropDrawerContent className="w-64">
        <DropDrawerLabel>Account Management</DropDrawerLabel>
        <DropDrawerGroup>
          <DropDrawerItem>
            <UserIcon className="mr-2 h-4 w-4" />
            View Profile
          </DropDrawerItem>
          <DropDrawerItem icon={<SettingsIcon className="h-4 w-4" />}>
            Account Settings
          </DropDrawerItem>
        </DropDrawerGroup>

        <DropDrawerSeparator />
        <DropDrawerLabel>Resources</DropDrawerLabel>

        <DropDrawerSub>
          <DropDrawerSubTrigger>
            <CloudIcon className="mr-2 h-4 w-4" />
            Cloud Resources
          </DropDrawerSubTrigger>
          <DropDrawerSubContent>
            <DropDrawerItem inset>Storage (10GB)</DropDrawerItem>
            <DropDrawerItem inset>Compute (2 vCPUs)</DropDrawerItem>
            <DropDrawerItem inset>Networking</DropDrawerItem>
          </DropDrawerSubContent>
        </DropDrawerSub>

        <DropDrawerSub>
          <DropDrawerSubTrigger>
            <ShieldIcon className="mr-2 h-4 w-4" />
            Security Center
          </DropDrawerSubTrigger>
          <DropDrawerSubContent>
            <DropDrawerItem>
              <KeyIcon className="mr-2 h-4 w-4" />
              Password Manager
            </DropDrawerItem>
            <DropDrawerSeparator />
            <DropDrawerSub>
              <DropDrawerSubTrigger>
                <BellIcon className="mr-2 h-4 w-4" />
                Notifications
              </DropDrawerSubTrigger>
              <DropDrawerSubContent>
                <DropDrawerItem inset>Email Alerts</DropDrawerItem>
                <DropDrawerItem inset>Push Notifications</DropDrawerItem>
                <DropDrawerItem inset disabled>
                  SMS Alerts (Coming Soon)
                </DropDrawerItem>
              </DropDrawerSubContent>
            </DropDrawerSub>
          </DropDrawerSubContent>
        </DropDrawerSub>

        <DropDrawerSeparator />
        <DropDrawerGroup>
          <DropDrawerItem>
            <LifeBuoyIcon className="mr-2 h-4 w-4" />
            Help & Support
          </DropDrawerItem>
          <DropDrawerItem variant="destructive">
            <LogOutIcon className="mr-2 h-4 w-4" />
            Sign Out
          </DropDrawerItem>
        </DropDrawerGroup>

        <DropDrawerFooter>
          <p className="text-xs text-center text-muted-foreground pb-2">
            Signed in as admin@example.com
          </p>
          <Button variant="outline" className="w-full">
            Switch Account
          </Button>
        </DropDrawerFooter>
      </DropDrawerContent>
    </DropDrawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A comprehensive example showcasing most features of the DropDrawer component including submenus, groups, separators, and footer.",
      },
    },
  },
};
