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

/**
 * Classic File/Edit/View menubar like desktop applications.
 */
export const FileEditView: Story = {
  render: () => (
    <div style={{width: "100%"}}>
      <Menubar style={{borderBottom: "1px solid #e5e7eb", paddingBottom: "8px"}}>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <svg
                style={{marginRight: "8px", width: "16px", height: "16px"}}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              New Document
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘N</span>
            </MenubarItem>
            <MenubarItem>
              <svg
                style={{marginRight: "8px", width: "16px", height: "16px"}}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
                />
              </svg>
              Open...
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘O</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Save
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘S</span>
            </MenubarItem>
            <MenubarItem>Save As...</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Export
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘E</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Close</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘Z</span>
            </MenubarItem>
            <MenubarItem>
              Redo
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘⇧Z</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Cut
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘X</span>
            </MenubarItem>
            <MenubarItem>
              Copy
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘C</span>
            </MenubarItem>
            <MenubarItem>
              Paste
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘V</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Select All</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>Show Sidebar</MenubarCheckboxItem>
            <MenubarCheckboxItem>Show Minimap</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>Show Line Numbers</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem>
              Zoom In
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘+</span>
            </MenubarItem>
            <MenubarItem>
              Zoom Out
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘-</span>
            </MenubarItem>
            <MenubarItem>
              Reset Zoom
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘0</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  ),
};

/**
 * Menubar items showing keyboard shortcuts for power users.
 */
export const WithShortcuts: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Actions</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
            Search
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: "2px",
                alignItems: "center",
              }}>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                ⌘
              </kbd>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                K
              </kbd>
            </span>
          </MenubarItem>
          <MenubarItem>
            New Tab
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: "2px",
                alignItems: "center",
              }}>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                ⌘
              </kbd>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                T
              </kbd>
            </span>
          </MenubarItem>
          <MenubarItem>
            Close Tab
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: "2px",
                alignItems: "center",
              }}>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                ⌘
              </kbd>
              <kbd
                style={{
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                }}>
                W
              </kbd>
            </span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Tools</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Developer Tools
            <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>F12</span>
          </MenubarItem>
          <MenubarItem>
            Task Manager
            <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⇧⎋</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};

/**
 * Menubar with disabled menu items showing unavailable actions.
 */
export const Disabled: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
      <p style={{fontSize: "14px", color: "#6b7280"}}>Some menu items are disabled when conditions aren't met:</p>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem disabled>
              Paste
              <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>⌘V</span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Undo</MenubarItem>
            <MenubarItem disabled>Redo</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Bold</MenubarItem>
            <MenubarItem>Italic</MenubarItem>
            <MenubarItem disabled>
              Strikethrough
              <span
                style={{
                  marginLeft: "8px",
                  padding: "2px 6px",
                  background: "#fef3c7",
                  color: "#92400e",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                }}>
                PRO
              </span>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Code Block</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger style={{opacity: 0.5, cursor: "not-allowed"}}>Export</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled>PDF</MenubarItem>
            <MenubarItem disabled>Word</MenubarItem>
            <MenubarItem disabled>Markdown</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <p style={{fontSize: "12px", color: "#9ca3af"}}>💡 Disabled items appear grayed out and cannot be clicked</p>
    </div>
  ),
};
