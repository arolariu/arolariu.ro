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
