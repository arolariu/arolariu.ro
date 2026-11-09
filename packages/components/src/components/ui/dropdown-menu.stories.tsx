import {DirectionProvider} from "@base-ui/react/direction-provider";
import {File, FolderOpen, Save, Trash2} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "Components/Navigation/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Named Popup, correctly grouped labels, disabled item and canonical Button composition. */
export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='Account actions'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem disabled>Team settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          nativeButton={false}
          render={<a href='#subscription' />}>
          Subscription
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

function CheckboxExample(): React.JSX.Element {
  const [toolbar, setToolbar] = React.useState(true);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>View options</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='Appearance options'>
        <DropdownMenuGroup>
          <DropdownMenuLabel inset>Appearance</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            inset
            checked={toolbar}
            onCheckedChange={setToolbar}>
            Show toolbar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            inset
            defaultChecked>
            Show sidebar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem inset>Show panel</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            inset
            disabled>
            Managed setting
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Real controlled and uncontrolled native checkbox rows with inset indicators. */
export const WithCheckboxes: Story = {render: () => <CheckboxExample />};

/** Real selectable radio group, not a read-only checked lookalike. */
export const WithRadioGroup: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>Panel position</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='Panel placement'>
        <DropdownMenuRadioGroup defaultValue='bottom'>
          <DropdownMenuLabel inset>Position</DropdownMenuLabel>
          <DropdownMenuRadioItem
            inset
            value='top'>
            Top
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            inset
            value='bottom'>
            Bottom
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            inset
            value='right'>
            Right
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Real portaled nested menus and the public Shortcut presentation component. */
export const WithSubmenus: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>Actions</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='File actions'>
        <DropdownMenuItem>
          New file<DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          New window<DropdownMenuShortcut>⌘⇧N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-label='Share options'>
            <DropdownMenuItem>Email link</DropdownMenuItem>
            <DropdownMenuItem>Messages</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent aria-label='More sharing options'>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Notes</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Decorative icons sized by the actual menu's CSS Module. */
export const WithIcons: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>File menu</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='File operations'>
        <DropdownMenuItem>
          <File aria-hidden='true' />
          New document
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FolderOpen aria-hidden='true' />
          Open folder
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Save aria-hidden='true' />
          Save
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Canonical destructive Item API; no manual colors or styled substitutes. */
export const Destructive: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant='outline' />}>Item actions</DropdownMenuTrigger>
      <DropdownMenuContent aria-label='Item actions'>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive'>
          <Trash2 aria-hidden='true' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Primitive callback state is provided after the Menu computes its actual open state. */
export const StateAwareRender: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={(props, state) => <button {...props}>{state.open ? "Close actions" : "Open actions"}</button>} />
      <DropdownMenuContent
        aria-label='State-aware menu'
        render={(props, state) => (
          <section
            {...props}
            data-nested={state.nested}
          />
        )}>
        <DropdownMenuCheckboxItem
          render={(props, state) => (
            <div
              {...props}
              data-checked={state.checked}
            />
          )}>
          Toolbar
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem>Rename</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Logical submenu placement, indicator inset and arrow direction in RTL. */
export const RightToLeft: Story = {
  render: () => (
    <DirectionProvider direction='rtl'>
      <div dir='rtl'>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant='outline' />}>RTL actions</DropdownMenuTrigger>
          <DropdownMenuContent aria-label='RTL actions'>
            <DropdownMenuCheckboxItem
              inset
              defaultChecked>
              Toolbar
            </DropdownMenuCheckboxItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Share</DropdownMenuSubTrigger>
              <DropdownMenuSubContent aria-label='RTL share options'>
                <DropdownMenuItem>Email</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DirectionProvider>
  ),
};
