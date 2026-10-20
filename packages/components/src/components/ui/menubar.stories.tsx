import {File, FolderOpen, Save} from "lucide-react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

const meta = {
  title: "Components/Navigation/Menubar",
  component: Menubar,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Menubar>;
export default meta;
type Story = StoryObj<typeof meta>;

function ApplicationMenus(): React.JSX.Element {
  return (
    <Menubar aria-label='Application menus'>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent aria-label='File actions'>
          <MenubarItem>
            <File aria-hidden='true' />
            New document<MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <FolderOpen aria-hidden='true' />
            Open<MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <Save aria-hidden='true' />
            Save<MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>Save all</MenubarItem>
          <MenubarSeparator />
          <MenubarItem variant='destructive'>Close document</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent aria-label='Edit actions'>
          <MenubarItem>
            Undo<MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Redo<MenubarShortcut>⌘⇧Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Cut<MenubarShortcut>⌘X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Copy<MenubarShortcut>⌘C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Paste<MenubarShortcut>⌘V</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent aria-label='View options'>
          <MenubarCheckboxItem
            inset
            defaultChecked>
            Show toolbar
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            inset
            defaultChecked>
            Show sidebar
          </MenubarCheckboxItem>
          <MenubarCheckboxItem inset>Show status bar</MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

/** Actual menu triggers, Popup names, shortcut API and selectable checkbox rows. */
export const Default: Story = {render: () => <ApplicationMenus />};
/** Classic file/edit/view composition uses the real exported components. */
export const FileEditView: Story = {render: () => <ApplicationMenus />};

/** Real portaled nested menus and a selectable labelled radio group. */
export const WithSubmenus: Story = {
  render: () => (
    <Menubar aria-label='Editor menus'>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent aria-label='File actions'>
          <MenubarItem>New file</MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Open recent</MenubarSubTrigger>
            <MenubarSubContent aria-label='Recent files'>
              <MenubarItem>project-1.tsx</MenubarItem>
              <MenubarItem>project-2.tsx</MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger>More files</MenubarSubTrigger>
                <MenubarSubContent aria-label='More recent files'>
                  <MenubarItem>project-3.tsx</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Preferences</MenubarTrigger>
        <MenubarContent aria-label='Preferences'>
          <MenubarRadioGroup defaultValue='light'>
            <MenubarLabel inset>Theme</MenubarLabel>
            <MenubarRadioItem
              inset
              value='light'>
              Light
            </MenubarRadioItem>
            <MenubarRadioItem
              inset
              value='dark'>
              Dark
            </MenubarRadioItem>
            <MenubarRadioItem
              inset
              value='system'>
              System
            </MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/** Minimal native menus without a parallel custom styled menu implementation. */
export const Compact: Story = {
  render: () => (
    <Menubar aria-label='Compact menus'>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent aria-label='File'>
          <MenubarItem>New</MenubarItem>
          <MenubarItem>Open</MenubarItem>
          <MenubarItem>Save</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Help</MenubarTrigger>
        <MenubarContent aria-label='Help'>
          <MenubarItem>Documentation</MenubarItem>
          <MenubarItem>About</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/** Vertical menus open toward the inline end (right in LTR, left in RTL) rather than covering the next trigger. */
export const Vertical: Story = {
  render: () => (
    <Menubar
      aria-label='Workspace menus'
      orientation='vertical'>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent aria-label='File actions'>
          <MenubarItem>New document</MenubarItem>
          <MenubarItem>Open</MenubarItem>
          <MenubarSeparator />
          <MenubarItem variant='destructive'>Close document</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent aria-label='Edit actions'>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent aria-label='View options'>
          <MenubarCheckboxItem
            inset
            defaultChecked>
            Show toolbar
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/** Uses MenuShortcut rather than manually styled spans or keycap lookalikes. */
export const WithShortcuts: Story = {
  render: () => (
    <Menubar aria-label='Action menus'>
      <MenubarMenu>
        <MenubarTrigger>Actions</MenubarTrigger>
        <MenubarContent aria-label='Actions'>
          <MenubarItem>
            Search<MenubarShortcut>⌘K</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            New tab<MenubarShortcut>⌘T</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Close tab<MenubarShortcut>⌘W</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/** Disabled root semantics remain primitive-owned across every trigger. */
export const Disabled: Story = {
  render: () => (
    <Menubar
      disabled
      aria-label='Disabled application menus'>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Copy</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/** Root/trigger/Popup callbacks receive their actual distinct native states. */
export const StateAwareRender: Story = {
  render: () => (
    <Menubar
      aria-label='State-aware menus'
      render={(props, state) => (
        <nav
          {...props}
          data-menu-open={state.hasSubmenuOpen}
        />
      )}>
      <MenubarMenu>
        <MenubarTrigger render={(props, state) => <button {...props}>{state.open ? "Close file menu" : "File"}</button>} />
        <MenubarContent
          aria-label='File actions'
          render={(props, state) => (
            <section
              {...props}
              data-nested={state.nested}
            />
          )}>
          <MenubarItem>Rename</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
