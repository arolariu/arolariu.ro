import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Button,
} from "../dist";
import {
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  CreditCardIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  CloudIcon,
  GlobeIcon,
  ServerIcon,
  DatabaseIcon,
  UserPlusIcon,
} from "lucide-react";

const meta: Meta<typeof DropdownMenu> = {
  title: "Design System/Dropdown",
  component: DropdownMenu,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Dropdown Menu Component**

Displays a menu of actions or options triggered by an element (like a button), appearing in a popover. Built upon the Radix UI Dropdown Menu primitive, ensuring robust accessibility and keyboard navigation.

**Core Components (from Radix UI):**
*   \`<DropdownMenu>\`: The root component managing state and context. Accepts props like \`open\`, \`defaultOpen\`, \`onOpenChange\`, \`modal\`, \`dir\`.
*   \`<DropdownMenuTrigger>\`: The element (usually a \`<Button>\`) that toggles the menu's visibility on click or keyboard interaction.
*   \`<DropdownMenuPortal>\`: (Optional) Renders the menu content into a specific part of the DOM, typically the document body. \`<DropdownMenuContent>\` uses this by default.
*   \`<DropdownMenuContent>\`: The container for the menu items that appears as a popover. Handles positioning, styling, focus management, and accessibility attributes. Accepts props like \`side\`, \`sideOffset\`, \`align\`, \`alignOffset\`, \`loop\`.
*   \`<DropdownMenuGroup>\`: A semantic container (\`<div>\`) to group related menu items.
*   \`<DropdownMenuItem>\`: Represents a single action item (\`<div>\` with \`role="menuitem"\`). Handles selection via click or Enter key. Accepts \`disabled\` and \`onSelect\` props.
*   \`<DropdownMenuCheckboxItem>\`: A menu item (\`<div>\` with \`role="menuitemcheckbox"\`) that can be checked or unchecked. Requires \`checked\` and \`onCheckedChange\` props. Includes an indicator area.
*   \`<DropdownMenuRadioGroup>\`: Groups \`<DropdownMenuRadioItem>\` components, managing a single selected value. Requires \`value\` and \`onValueChange\` props.
*   \`<DropdownMenuRadioItem>\`: A menu item (\`<div>\` with \`role="menuitemradio"\`) within a radio group. Requires a \`value\` prop. Includes an indicator area.
*   \`<DropdownMenuLabel>\`: A non-interactive label (\`<div>\`) used for titling sections within the menu.
*   \`<DropdownMenuSeparator>\`: A visual divider (\`<div>\` with \`role="separator"\`) between items or groups.
*   \`<DropdownMenuShortcut>\`: Displays supplementary text (e.g., keyboard shortcut) aligned to the right within an item.
*   \`<DropdownMenuSub>\`: Container for creating nested submenus. Manages the open state of the submenu.
*   \`<DropdownMenuSubTrigger>\`: An item (\`<div>\` with \`role="menuitem"\`) that opens a submenu on hover or keyboard interaction. Requires a corresponding \`<DropdownMenuSubContent\`.
*   \`<DropdownMenuSubContent>\`: The content container for a submenu, appearing adjacent to the trigger.
*   \`<DropdownMenuArrow>\`: (Optional) Renders an arrow pointing from the content to the trigger.

**Key Features:**
*   **Accessibility**: Full keyboard navigation (arrow keys, Home, End, Enter, Space, Escape), focus management, and ARIA roles/attributes.
*   **Modality (\`modal\` prop):** Controls whether interaction outside the menu is prevented (default: true).
*   **Positioning**: Customizable positioning relative to the trigger (\`side\`, \`align\`, offsets).
*   **Composition**: Highly composable for creating complex menus with checkboxes, radio groups, and submenus.

See the [shadcn/ui Dropdown Menu documentation](https://ui.shadcn.com/docs/components/dropdown-menu) and the [Radix UI Dropdown Menu documentation](https://www.radix-ui.com/primitives/docs/components/dropdown-menu) for comprehensive details.
        `,
      },
    },
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Controlled open state of the dropdown menu.",
    },
    onOpenChange: {
      action: "onOpenChange",
      description: "Callback when the open state changes.",
    },
    modal: {
      control: "boolean",
      description:
        "Determines if the menu behaves modally (prevents interaction outside).",
      table: {
        defaultValue: { summary: true },
      },
    },
    dir: {
      control: "radio",
      options: ["ltr", "rtl"],
      description: "Text direction.",
    },
    // Note: DropdownMenuContent props like side, align, sideOffset, alignOffset etc. are controlled via the content component itself.
  },
};

export default meta;

type Story = StoryObj<typeof DropdownMenu>;

// Basic dropdown menu
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A simple dropdown menu with basic text items and separators.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates adding icons (using lucide-react) and keyboard shortcuts to menu items.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">My Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOutIcon className="mr-2 h-4 w-4" />
            <span>Log out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// With checkboxes
export const WithCheckboxes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to use \`<DropdownMenuCheckboxItem>\` for toggleable options, managing state with React hooks.",
      },
    },
  },
  render: function WithCheckboxesExample() {
    const [showStatusBar, setShowStatusBar] = React.useState(true);
    const [showActivityBar, setShowActivityBar] = React.useState(false);
    const [showPanel, setShowPanel] = React.useState(false);

    return (
      <div className="flex items-center justify-center p-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">View Options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showStatusBar}
              onCheckedChange={setShowStatusBar}
            >
              Status Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showActivityBar}
              onCheckedChange={setShowActivityBar}
            >
              Activity Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showPanel}
              onCheckedChange={setShowPanel}
            >
              Panel
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};

// With radio items
export const WithRadioItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates using \`<DropdownMenuRadioGroup>\` and \`<DropdownMenuRadioItem>\` for selecting one option from a set.",
      },
    },
  },
  render: function WithRadioItemsExample() {
    const [position, setPosition] = React.useState("bottom");

    return (
      <div className="flex items-center justify-center p-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Panel Position</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={position}
              onValueChange={setPosition}
            >
              <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="left">Left</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};

// With sub menus
export const WithSubMenus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates creating nested menus using \`<DropdownMenuSub>\`, \`<DropdownMenuSubTrigger>\`, and \`<DropdownMenuSubContent>\`.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Deployment Options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <PlusIcon className="mr-2 h-4 w-4" />
            <span>New Deployment</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CloudIcon className="mr-2 h-4 w-4" />
              <span>Cloud Provider</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem>
                <GlobeIcon className="mr-2 h-4 w-4" />
                <span>AWS</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GlobeIcon className="mr-2 h-4 w-4" />
                <span>Google Cloud</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GlobeIcon className="mr-2 h-4 w-4" />
                <span>Azure</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <ServerIcon className="mr-2 h-4 w-4" />
                <span>Self-hosted</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <TrashIcon className="mr-2 h-4 w-4" />
            <span>Delete Deployment</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// Complex example with multiple sections and groups
export const ComplexExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A more elaborate example combining labels, groups, separators, icons, shortcuts, and submenus to build a realistic settings menu.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Configuration</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCardIcon className="mr-2 h-4 w-4" />
              <span>Subscription</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <KeyIcon className="mr-2 h-4 w-4" />
              <span>API Keys</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Team</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              <span>Invite Users</span>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <DatabaseIcon className="mr-2 h-4 w-4" />
                <span>Database</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Connect</DropdownMenuItem>
                <DropdownMenuItem>Backup</DropdownMenuItem>
                <DropdownMenuItem>Restore</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Advanced Options</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Replication</DropdownMenuItem>
                    <DropdownMenuItem>Sharding</DropdownMenuItem>
                    <DropdownMenuItem>Indexing</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <TrashIcon className="mr-2 h-4 w-4" />
            <span>Delete Account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// Context menu example (right-click)
export const ContextMenuExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to trigger a dropdown menu using the `onContextMenu` event (right-click) instead of a standard button click.",
      },
    },
  },
  render: function ContextMenuExample() {
    return (
      <div className="flex items-center justify-center p-10">
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden" />
          <div
            className="w-64 h-32 bg-neutral-100 rounded-md flex items-center justify-center dark:bg-neutral-800"
            onContextMenu={(e) => {
              e.preventDefault();
              const button = e.currentTarget
                .previousSibling as HTMLButtonElement;
              button?.click();
            }}
          >
            Right-click here
          </div>
          <DropdownMenuContent className="w-64">
            <DropdownMenuItem>
              <span>View</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Copy</span>
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Cut</span>
              <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <span>Delete</span>
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};

// Inset items
export const InsetItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the `inset` prop on \`<DropdownMenuItem>\` and \`<DropdownMenuLabel>\` to align items visually when some items have icons/checkboxes and others don't.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Regular item</DropdownMenuItem>
          <DropdownMenuItem inset>Inset item</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          <DropdownMenuItem inset>Another inset item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

// Disabled items
export const DisabledItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates how to disable individual menu items, checkbox items, and radio items using the `disabled` prop.",
      },
    },
  },
  render: () => (
    <div className="flex items-center justify-center p-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem>Available Action</DropdownMenuItem>
          <DropdownMenuItem disabled>Disabled Action</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem disabled checked>
            Disabled Checkbox
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value="radio1">
            <DropdownMenuRadioItem value="radio1">
              Available Option
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="radio2" disabled>
              Disabled Option
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};
