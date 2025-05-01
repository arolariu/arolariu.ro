import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Button,
} from "../dist";
import {
  CalendarIcon,
  GearIcon,
  PaletteIcon,
  PersonIcon,
  SearchIcon,
} from "lucide-react";

const meta: Meta<typeof Command> = {
  title: "Design System/Command",
  component: Command,
};

export default meta;

type Story = StoryObj<typeof Command>;

// Basic command menu
export const Basic: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>Search</span>
          </CommandItem>
          <CommandItem>
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <GearIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <PaletteIcon className="mr-2 h-4 w-4" />
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
          <SearchIcon className="mr-2 h-4 w-4" />
          Open Command Menu
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Documents">
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
              <CommandGroup heading="Recent">
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
      { category: "Projects", items: ["Dashboard", "E-commerce", "Analytics"] },
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
          items: category.items.filter((item) =>
            item.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((category) => category.items.length > 0);
    }, [search, bookmarks]);

    return (
      <Command className="rounded-lg border shadow-md w-[400px]">
        <CommandInput
          placeholder="Search bookmarks..."
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
                    onSelect={() => console.log(`Selected: ${item}`)}
                  >
                    <span>{item}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          ))}
          <CommandGroup heading="Actions">
            <CommandItem className="text-blue-600">
              <span>Add new bookmark</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem className="text-blue-600">
              <span>Manage categories</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  },
};
