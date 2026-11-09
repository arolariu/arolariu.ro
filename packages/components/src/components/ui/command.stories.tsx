import {Calendar, File, Folder, Settings} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
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
} from "./command";
const storyStyles = `
.ac-story-command-story {
  width: min(28rem, calc(100vw - 2rem));
  border: 1px solid var(--ac-border);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.ac-story-command-storyControls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ac-space-2);
  margin-block-end: var(--ac-space-3);
}
`;

const storyClasses = {
  story: "ac-story-command-story",
  storyControls: "ac-story-command-storyControls",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Navigation/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Native registry engine, not cmdk. Search uses case-insensitive substrings by default. Rendered order is kept and navigated; while searching, positive custom scores reorder groups/items with rendered-order ties, and clearing restores rendered order. Root value controls selection (keep option values unique); CommandInput value controls search. Home/End, arrows, Meta endpoints, Alt+arrow group boundaries in visual order and default Ctrl+n/j/p/k navigate.",
      },
    },
  },
} satisfies Meta<typeof Command>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Searchable grouped actions, including a disabled native option. */
export const Default: Story = {
  render: () => (
    <Command className={storyClasses.story}>
      <CommandInput
        placeholder='Type a command or search...'
        aria-label='Search commands'
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Suggestions'>
          <CommandItem value='calendar'>Calendar</CommandItem>
          <CommandItem value='emoji'>Search Emoji</CommandItem>
          <CommandItem
            value='calculator'
            disabled>
            Calculator (unavailable)
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Settings'>
          <CommandItem value='profile'>Profile</CommandItem>
          <CommandItem value='billing'>Billing</CommandItem>
          <CommandItem
            value='settings'
            keywords={["preferences"]}>
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** Icons remain decorative; shortcut text uses the public presentation helper. */
export const WithIcons: Story = {
  render: () => (
    <Command className={storyClasses.story}>
      <CommandInput aria-label='Search actions' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Actions'>
          <CommandItem value='new-file'>
            <File aria-hidden='true' />
            New File<CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem value='new-folder'>
            <Folder aria-hidden='true' />
            New Folder<CommandShortcut>⌘F</CommandShortcut>
          </CommandItem>
          <CommandItem value='calendar'>
            <Calendar aria-hidden='true' />
            Calendar
          </CommandItem>
          <CommandItem value='settings'>
            <Settings aria-hidden='true' />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** Alt+arrows jump to the next/previous group boundary in visual order; the pinned group inherits forceMount. */
export const WithMultipleGroups: Story = {
  render: () => (
    <Command
      className={storyClasses.story}
      loop>
      <CommandInput aria-label='Search grouped actions' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading='Navigation'>
          <CommandItem value='dashboard'>Dashboard</CommandItem>
          <CommandItem value='projects'>Projects</CommandItem>
        </CommandGroup>
        <CommandSeparator alwaysRender />
        <CommandGroup
          heading='Always available'
          forceMount>
          <CommandItem value='help'>Help</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** Focusable native options also work without a combobox. */
export const WithoutSearch: Story = {
  render: () => (
    <Command
      className={storyClasses.story}
      defaultValue='print'>
      <CommandList>
        <CommandGroup heading='Quick actions'>
          <CommandItem value='new'>New Document</CommandItem>
          <CommandItem value='recent'>Open Recent</CommandItem>
          <CommandItem value='print'>Print</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** Retained categories and icon presentation without inline or utility styling. */
export const WithCategories: Story = {
  render: () => (
    <Command className={storyClasses.story}>
      <CommandInput aria-label='Search all categories' />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading='Files'>
          <CommandItem value='open-file'>
            <File aria-hidden='true' />
            Open File
          </CommandItem>
          <CommandItem value='new-folder'>
            <Folder aria-hidden='true' />
            New Folder
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='Preferences'>
          <CommandItem value='settings'>
            <Settings aria-hidden='true' />
            Settings
          </CommandItem>
          <CommandItem value='keyboard'>Keyboard Shortcuts</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
/** Explicit rendered order with a selected recent action. */
export const WithRecentItems: Story = {
  render: () => (
    <Command
      className={storyClasses.story}
      defaultValue='notes'>
      <CommandInput aria-label='Search recent documents' />
      <CommandList>
        <CommandEmpty>No matching documents.</CommandEmpty>
        <CommandGroup heading='Recent'>
          <CommandItem value='report'>
            Project report<CommandShortcut>2 hours ago</CommandShortcut>
          </CommandItem>
          <CommandItem value='notes'>
            Meeting notes<CommandShortcut>Yesterday</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='All files'>
          <CommandItem value='documents'>Documents</CommandItem>
          <CommandItem value='downloads'>Downloads</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
/** Empty live status with an initial nonmatching uncontrolled query. */
export const Empty: Story = {
  render: () => (
    <Command className={storyClasses.story}>
      <CommandInput
        defaultValue='zz'
        aria-label='Search commands'
      />
      <CommandList>
        <CommandEmpty>No commands found. Try a different search.</CommandEmpty>
        <CommandGroup heading='Suggestions'>
          <CommandItem value='apple'>Apple</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

function ControlledPalette(): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState("apple");
  const [reject, setReject] = React.useState(false);
  return (
    <div>
      <div className={storyClasses.storyControls}>
        <Button onClick={() => setSearch("zz")}>No matches</Button>
        <Button onClick={() => setSearch("app")}>Find apple directly</Button>
        <Button
          onClick={() => setReject((current) => !current)}
          aria-pressed={reject}>
          Reject proposals
        </Button>
      </div>
      <Command
        className={storyClasses.story}
        value={selected}
        onValueChange={(proposal) => {
          if (!reject) setSelected(proposal);
        }}>
        <CommandInput
          aria-label='Search fruit'
          value={search}
          onValueChange={(proposal) => {
            if (!reject) setSearch(proposal);
          }}
        />
        <CommandList>
          <CommandEmpty>No matching fruit.</CommandEmpty>
          <CommandGroup heading='Fruit'>
            <CommandItem value='apple'>Apple</CommandItem>
            <CommandItem value='banana'>Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <output aria-live='polite'>
        Committed search: {search}; selected: {selected}
      </output>
    </div>
  );
}

/** Demonstrates direct zz→app recovery and visibly rejected controlled proposals. */
export const Controlled: Story = {render: () => <ControlledPalette />};

/** Positive score ordering; equal-scored Second and Third keep their rendered order. */
export const Scored: Story = {
  render: () => (
    <Command
      className={storyClasses.story}
      filter={(value) => (value === "first" ? 0.2 : 0.9)}>
      <CommandInput
        defaultValue='query'
        aria-label='Search scored commands'
      />
      <CommandList>
        <CommandGroup heading='Scored results'>
          <CommandItem value='first'>First</CommandItem>
          <CommandItem value='second'>Second</CommandItem>
          <CommandItem value='third'>Third</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

/** Real Dialog composition: no automatic/nested Command roots; focus is primitive-owned. */
export const InDialog: Story = {
  render: () => (
    <CommandDialog
      defaultOpen
      title='Command palette'
      description='Search for an action to run.'
      showCloseButton>
      <Command>
        <CommandInput aria-label='Search dialog actions' />
        <CommandList>
          <CommandEmpty>No matching actions.</CommandEmpty>
          <CommandGroup heading='Actions'>
            <CommandItem value='open'>Open document</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  ),
};
