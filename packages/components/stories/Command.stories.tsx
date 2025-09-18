import type {Meta, StoryObj} from "@storybook/react";
import {CalendarIcon, GearIcon, PaletteIcon, PersonIcon, SearchIcon} from "lucide-react";
import React from "react";
import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../dist";

const meta: Meta<typeof Command> = {
  title: "Design System/Command",
  component: Command,
  parameters: {
    docs: {
      description: {
        component: `
**Command Component**

A versatile component for building command palettes, search interfaces, and menus, enabling fast keyboard navigation and filtering of items. Built upon the \`cmdk\` library.

**Core Components:**
*   \`<Command>\`: The root component providing context and managing state (search query, selected value). Accepts props like \`value\`, \`onValueChange\`, \`filter\`, \`shouldFilter\`.
*   \`<CommandInput>\`: The input field (\`<input>\`) where users type search queries. Automatically linked to the command state.
*   \`<CommandList>\`: The container (\`<div>\`) for the list of items and groups. Handles scrolling and virtual rendering if needed.
*   \`<CommandEmpty>\`: Content (\`<div>\`) displayed within the list when no items match the current search query or no items exist.
*   \`<CommandGroup>\`: Groups related command items (\`<div>\`). Can have an optional \`heading\` prop displayed above the group.
*   \`<CommandItem>\`: Represents a single selectable item (\`<div>\`). Handles selection state, keyboard navigation, and filtering logic. Accepts \`value\` and \`onSelect\` props.
*   \`<CommandSeparator>\`: A visual divider (\`<div>\`) rendered between groups or items.
*   \`<CommandShortcut>\`: Displays supplementary text (e.g., keyboard shortcut) aligned to the right within a \`<CommandItem>\`.
*   \`<CommandDialog>\`: A convenience component that wraps \`<Command>\` within a \`<Dialog>\`, providing a ready-to-use command palette modal.

**Key Features:**
*   **Fast Filtering**: Built-in filtering based on the search query in \`<CommandInput>\`. Customizable filtering logic via the \`filter\` prop on \`<Command>\`.
*   **Keyboard Navigation**: Full keyboard support for navigating items (Arrow keys), selecting items (Enter), and managing focus.
*   **State Management**: Handles search query and selected item state internally, with options for controlled behavior.
*   **Composable**: Flexible structure allows for grouping, separators, and custom rendering of items.
*   **Extensible**: Can be integrated into dialogs (\`<CommandDialog>\`) or popovers for various UI patterns.

See the [shadcn/ui Command documentation](https://ui.shadcn.com/docs/components/command) and the [cmdk documentation](https://cmdk.paco.me/) for comprehensive details.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Command>;

// Basic command menu
export const Basic: Story = {
  render: () => (
    <Command className='rounded-lg border shadow-md'>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Suggestions'>
          <CommandItem>
            <CalendarIcon className='mr-2 h-4 w-4' />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <SearchIcon className='mr-2 h-4 w-4' />
            <span>Search</span>
          </CommandItem>
          <CommandItem>
            <PersonIcon className='mr-2 h-4 w-4' />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Settings'>
          <CommandItem>
            <GearIcon className='mr-2 h-4 w-4' />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <PaletteIcon className='mr-2 h-4 w-4' />
            <span>Theme</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

// Command menu with dialog
export const WithDialog: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>
          <SearchIcon className='mr-2 h-4 w-4' />
          Open Command Menu
        </Button>
        <CommandDialog
          open={open}
          onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder='Type a command or search...' />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading='Documents'>
                <CommandItem>
                  <span>Annual Report.pdf</span>
                </CommandItem>
                <CommandItem>
                  <span>Q4 Presentation.pptx</span>
                </CommandItem>
                <CommandItem>
                  <span>Budget Forecast.xlsx</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading='Recent'>
                <CommandItem>
                  <span>Project Proposal</span>
                  <CommandShortcut>5d ago</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <span>Design System</span>
                  <CommandShortcut>2d ago</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </>
    );
  },
};

// Command menu with nested groups and filtering
export const ComplexExample: Story = {
  render: () => {
    // Mock data for demonstration
    const bookmarks = [
      {
        category: "Documentation",
        items: ["API Reference", "Getting Started", "Tutorials"],
      },
      {category: "Projects", items: ["Dashboard", "E-commerce", "Analytics"]},
      {
        category: "Tools",
        items: ["Color Picker", "Icon Browser", "Code Generator"],
      },
    ];

    const [search, setSearch] = React.useState("");

    const filteredBookmarks = React.useMemo(() => {
      if (!search) return bookmarks;

      return bookmarks
        .map((category) => ({
          category: category.category,
          items: category.items.filter((item) => item.toLowerCase().includes(search.toLowerCase())),
        }))
        .filter((category) => category.items.length > 0);
    }, [search, bookmarks]);

    return (
      <Command className='w-[400px] rounded-lg border shadow-md'>
        <CommandInput
          placeholder='Search bookmarks...'
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No bookmarks found.</CommandEmpty>
          {filteredBookmarks.map((categoryData) => (
            <React.Fragment key={categoryData.category}>
              <CommandGroup heading={categoryData.category}>
                {categoryData.items.map((item) => (
                  <CommandItem
                    key={item}
                    onSelect={() => console.log(`Selected: ${item}`)}>
                    <span>{item}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          ))}
          <CommandGroup heading='Actions'>
            <CommandItem className='text-blue-600'>
              <span>Add new bookmark</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem className='text-blue-600'>
              <span>Manage categories</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  },
};
