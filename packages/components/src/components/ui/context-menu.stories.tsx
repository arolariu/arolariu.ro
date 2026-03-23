import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

const meta = {
  title: "Components/Navigation/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default context menu triggered by right-click.
 */
export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-64'>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Forward</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Save Page As...</ContextMenuItem>
        <ContextMenuItem>Create Shortcut...</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Inspect</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/**
 * Context menu with checkbox items and shortcuts.
 */
export const WithCheckboxes: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-64'>
        <ContextMenuItem>
          <span>Cut</span>
          <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘X</span>
        </ContextMenuItem>
        <ContextMenuItem>
          <span>Copy</span>
          <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘C</span>
        </ContextMenuItem>
        <ContextMenuItem>
          <span>Paste</span>
          <span className='text-muted-foreground ml-auto text-xs tracking-widest'>⌘V</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Show Toolbar</ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Sidebar</ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked>Full Screen</ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/**
 * Context menu with submenu and radio items.
 */
export const WithSubmenus: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-64'>
        <ContextMenuItem>
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
          New File
        </ContextMenuItem>
        <ContextMenuItem>
          <svg
            className='mr-2 h-4 w-4'
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
          New Folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <svg
              className='mr-2 h-4 w-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'
              />
            </svg>
            Share
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Email</ContextMenuItem>
            <ContextMenuItem>Messages</ContextMenuItem>
            <ContextMenuItem>Notes</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <svg
            className='mr-2 h-4 w-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
            />
          </svg>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/**
 * Context menu with labels and radio groups.
 */
export const WithLabelsAndRadio: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm'>
        Right click here
      </ContextMenuTrigger>
      <ContextMenuContent className='w-64'>
        <ContextMenuLabel>View Options</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value='grid'>
          <ContextMenuRadioItem value='grid'>Grid View</ContextMenuRadioItem>
          <ContextMenuRadioItem value='list'>List View</ContextMenuRadioItem>
          <ContextMenuRadioItem value='compact'>Compact View</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuLabel>Sort By</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value='name'>
          <ContextMenuRadioItem value='name'>Name</ContextMenuRadioItem>
          <ContextMenuRadioItem value='date'>Date Modified</ContextMenuRadioItem>
          <ContextMenuRadioItem value='size'>Size</ContextMenuRadioItem>
          <ContextMenuRadioItem value='type'>Type</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
