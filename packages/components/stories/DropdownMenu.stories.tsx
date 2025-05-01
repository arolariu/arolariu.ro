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
};

export default meta;

type Story = StoryObj<typeof DropdownMenu>;

// Basic dropdown menu
export const Basic: Story = {
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
