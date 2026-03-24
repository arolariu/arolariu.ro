import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator} from "./command";

const meta = {
  title: "Components/Navigation/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default command palette with search and items.
 */
export const Default: Story = {
  render: () => (
    <Command className='w-[450px] rounded-lg border shadow-md'>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Suggestions'>
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Settings'>
          <CommandItem>Profile</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Command palette with icons and keyboard shortcuts.
 */
export const WithIcons: Story = {
  render: () => (
    <Command className='w-[450px] rounded-lg border shadow-md'>
      <CommandInput placeholder='Search commands...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Actions'>
          <CommandItem>
            <svg
              className='mr-2 h-4 w-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            <span>New File</span>
            <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘N</span>
          </CommandItem>
          <CommandItem>
            <svg
              className='mr-2 h-4 w-4'
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
            <span>Copy</span>
            <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘C</span>
          </CommandItem>
          <CommandItem>
            <svg
              className='mr-2 h-4 w-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
              />
            </svg>
            <span>Paste</span>
            <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘V</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Command palette with multiple categorized groups.
 */
export const WithMultipleGroups: Story = {
  render: () => (
    <Command className='w-[450px] rounded-lg border shadow-md'>
      <CommandInput placeholder='Search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Navigation'>
          <CommandItem>Dashboard</CommandItem>
          <CommandItem>Projects</CommandItem>
          <CommandItem>Team</CommandItem>
          <CommandItem>Calendar</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Actions'>
          <CommandItem>Create New Project</CommandItem>
          <CommandItem>Invite Team Member</CommandItem>
          <CommandItem>Export Data</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Settings'>
          <CommandItem>Profile Settings</CommandItem>
          <CommandItem>Account Preferences</CommandItem>
          <CommandItem>Keyboard Shortcuts</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Simple command list without search input.
 */
export const WithoutSearch: Story = {
  render: () => (
    <Command className='w-[350px] rounded-lg border shadow-md'>
      <CommandList>
        <CommandGroup heading='Quick Actions'>
          <CommandItem>New Document</CommandItem>
          <CommandItem>Open Recent</CommandItem>
          <CommandItem>Save As...</CommandItem>
          <CommandItem>Print</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Command palette with file, settings, and user categories.
 */
export const WithCategories: Story = {
  render: () => (
    <Command style={{width: "450px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
      <CommandInput placeholder='Search across all categories...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='📁 Files'>
          <CommandItem>
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
            <span>Open File</span>
          </CommandItem>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            <span>New File</span>
          </CommandItem>
          <CommandItem>
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
            <span>New Folder</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='⚙️ Settings'>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
              />
            </svg>
            <span>Preferences</span>
          </CommandItem>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
              />
            </svg>
            <span>Change Password</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='👤 User'>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
            <span>Profile</span>
          </CommandItem>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
              />
            </svg>
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Command palette showing a recently used items section.
 */
export const WithRecentItems: Story = {
  render: () => (
    <Command style={{width: "450px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
      <CommandInput placeholder='Search files and actions...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='🕐 Recent'>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>project-report.pdf</span>
            <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>2 hours ago</span>
          </CommandItem>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>meeting-notes.txt</span>
            <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>Yesterday</span>
          </CommandItem>
          <CommandItem>
            <svg
              style={{marginRight: "8px", width: "16px", height: "16px"}}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>budget-2024.xlsx</span>
            <span style={{marginLeft: "auto", fontSize: "12px", color: "#9ca3af"}}>3 days ago</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='All Files'>
          <CommandItem>Documents</CommandItem>
          <CommandItem>Downloads</CommandItem>
          <CommandItem>Pictures</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/**
 * Command palette with custom empty state message.
 */
export const Empty: Story = {
  render: () => (
    <Command style={{width: "450px", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"}}>
      <CommandInput placeholder='Search for commands...' />
      <CommandList>
        <CommandEmpty>
          <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "32px 16px"}}>
            <svg
              style={{width: "48px", height: "48px", color: "#d1d5db"}}
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
            <div style={{textAlign: "center"}}>
              <div style={{fontWeight: 500, marginBottom: "4px"}}>No commands found</div>
              <div style={{fontSize: "14px", color: "#6b7280"}}>Try searching for something else or use different keywords</div>
            </div>
          </div>
        </CommandEmpty>
        <CommandGroup heading='Suggestions'>
          <CommandItem>Dashboard</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
