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
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

const meta = {
  title: "Components/Navigation/Menubar",
  component: Menubar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default menubar with multiple menus.
 */
export const Default: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New Tab <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘T</span>
          </MenubarItem>
          <MenubarItem>
            New Window <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘N</span>
          </MenubarItem>
          <MenubarItem disabled>New Incognito Window</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Save <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘S</span>
          </MenubarItem>
          <MenubarItem>Save As...</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Print... <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘P</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Undo <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘Z</span>
          </MenubarItem>
          <MenubarItem>
            Redo <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⇧⌘Z</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Cut <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘X</span>
          </MenubarItem>
          <MenubarItem>
            Copy <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘C</span>
          </MenubarItem>
          <MenubarItem>
            Paste <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘V</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem checked>Show Toolbar</MenubarCheckboxItem>
          <MenubarCheckboxItem checked>Show Sidebar</MenubarCheckboxItem>
          <MenubarCheckboxItem>Show Status Bar</MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem>
            Actual Size <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘0</span>
          </MenubarItem>
          <MenubarItem>
            Zoom In <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘+</span>
          </MenubarItem>
          <MenubarItem>
            Zoom Out <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘-</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Full Screen <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌃⌘F</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/**
 * Menubar with submenus and radio groups.
 */
export const WithSubmenus: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New File</MenubarItem>
          <MenubarItem>New Folder</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Open Recent</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>project-1.tsx</MenubarItem>
              <MenubarItem>project-2.tsx</MenubarItem>
              <MenubarItem>project-3.tsx</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>Close</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Find</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Find in File</MenubarItem>
              <MenubarItem>Find in Folder</MenubarItem>
              <MenubarItem>Find in Workspace</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>Replace</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Preferences</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Theme</MenubarLabel>
          <MenubarSeparator />
          <MenubarRadioGroup value='light'>
            <MenubarRadioItem value='light'>Light</MenubarRadioItem>
            <MenubarRadioItem value='dark'>Dark</MenubarRadioItem>
            <MenubarRadioItem value='system'>System</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarItem>Settings</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/**
 * Compact menubar for minimal UI.
 */
export const Compact: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
          <MenubarItem>Open</MenubarItem>
          <MenubarItem>Save</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Cut</MenubarItem>
          <MenubarItem>Copy</MenubarItem>
          <MenubarItem>Paste</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Documentation</MenubarItem>
          <MenubarItem>About</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
