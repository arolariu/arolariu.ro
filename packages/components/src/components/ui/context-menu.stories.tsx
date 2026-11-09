import {FilePlus, FolderPlus, MoreHorizontal, Trash2} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "./dropdown-menu";
const storyStyles = `
.ac-story-context-menu-storyTarget {
  display: grid;
  place-items: center;
  min-width: 18rem;
  min-height: 9rem;
  padding: var(--ac-space-4);
  border: 1px dashed var(--ac-border);
  border-radius: var(--ac-radius-md);
  color: var(--ac-foreground);
  font-size: var(--ac-text-sm);
}

.ac-story-context-menu-storyFile {
  background: transparent;
  font: inherit;
}

.ac-story-context-menu-storyRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ac-space-3);
}

.ac-story-context-menu-storyStatus {
  flex-basis: 100%;
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
}
`;

const storyClasses = {
  storyTarget: "ac-story-context-menu-storyTarget",
  storyFile: "ac-story-context-menu-storyFile",
  storyRow: "ac-story-context-menu-storyRow",
  storyStatus: "ac-story-context-menu-storyStatus",
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
  title: "Components/Navigation/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Base UI opens the menu on right click, long press, or a keyboard `contextmenu` event (the context-menu key or Shift+F10 where the browser dispatches one) on a focused trigger. The default trigger is a non-focusable `<div>`, so most stories here are pointer-only demonstrations. In production, render the trigger as a focusable, named control and duplicate essential actions in keyboard-reachable controls, as the KeyboardPath story does.",
      },
    },
  },
} satisfies Meta<typeof ContextMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The real context trigger owns right-click/long-press behavior; a pointer-only demonstration (see KeyboardPath). */
export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click or long press here</ContextMenuTrigger>
      <ContextMenuContent aria-label='Page actions'>
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem disabled>Forward</ContextMenuItem>
        <ContextMenuItem>Reload</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Save page</ContextMenuItem>
        <ContextMenuItem>Inspect</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** Real interactive native checkbox rows and public shortcut components. */
export const WithCheckboxes: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click for view options</ContextMenuTrigger>
      <ContextMenuContent aria-label='View options'>
        <ContextMenuItem>
          Cut<ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Copy<ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel inset>Appearance</ContextMenuLabel>
          <ContextMenuCheckboxItem
            inset
            defaultChecked>
            Show toolbar
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem inset>Show sidebar</ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            inset
            defaultChecked>
            Full screen
          </ContextMenuCheckboxItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** Actual portaled submenu and destructive variant with decorative icons. */
export const WithSubmenus: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click for file actions</ContextMenuTrigger>
      <ContextMenuContent aria-label='File actions'>
        <ContextMenuItem>
          <FilePlus aria-hidden='true' />
          New file
        </ContextMenuItem>
        <ContextMenuItem>
          <FolderPlus aria-hidden='true' />
          New folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent aria-label='Share options'>
            <ContextMenuItem>Email</ContextMenuItem>
            <ContextMenuItem>Messages</ContextMenuItem>
            <ContextMenuItem>Notes</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant='destructive'>
          <Trash2 aria-hidden='true' />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** Radio group labels name the real role-bearing groups and values remain selectable. */
export const WithLabelsAndRadio: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click to choose view and sort order</ContextMenuTrigger>
      <ContextMenuContent aria-label='View and sort'>
        <ContextMenuRadioGroup defaultValue='grid'>
          <ContextMenuLabel inset>View</ContextMenuLabel>
          <ContextMenuRadioItem
            inset
            value='grid'>
            Grid
          </ContextMenuRadioItem>
          <ContextMenuRadioItem
            inset
            value='list'>
            List
          </ContextMenuRadioItem>
          <ContextMenuRadioItem
            inset
            value='compact'>
            Compact
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup defaultValue='name'>
          <ContextMenuLabel inset>Sort by</ContextMenuLabel>
          <ContextMenuRadioItem
            inset
            value='name'>
            Name
          </ContextMenuRadioItem>
          <ContextMenuRadioItem
            inset
            value='date'>
            Date modified
          </ContextMenuRadioItem>
          <ContextMenuRadioItem
            inset
            value='size'>
            Size
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** Public Shortcut API, without manual shortcut spans or inline styling. */
export const WithShortcuts: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click for edit actions</ContextMenuTrigger>
      <ContextMenuContent aria-label='Edit actions'>
        <ContextMenuItem>
          Undo<ContextMenuShortcut>⌘Z</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Redo<ContextMenuShortcut>⌘⇧Z</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>
          Cut<ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Copy<ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Paste<ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** Two real nested portaled submenus; keyboard activation and Escape are primitive-owned. */
export const NestedSubmenu: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={storyClasses.storyTarget}>Right click to export</ContextMenuTrigger>
      <ContextMenuContent aria-label='Export actions'>
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Export as</ContextMenuSubTrigger>
          <ContextMenuSubContent aria-label='Export formats'>
            <ContextMenuItem>PDF</ContextMenuItem>
            <ContextMenuItem>PNG</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More formats</ContextMenuSubTrigger>
              <ContextMenuSubContent aria-label='More formats'>
                <ContextMenuItem>JPEG</ContextMenuItem>
                <ContextMenuItem>WebP</ContextMenuItem>
                <ContextMenuItem>TIFF</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

/** State-aware trigger and Popup render functions evaluated only by Base UI. */
export const StateAwareRender: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger
        className={storyClasses.storyTarget}
        render={(props, state) => <section {...props}>{state.open ? "Menu open" : "Right click here"}</section>}
      />
      <ContextMenuContent
        aria-label='Custom context actions'
        render={(props, state) => (
          <section
            {...props}
            data-open={state.open}
          />
        )}>
        <ContextMenuItem>Rename</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

const reportActions = ["Rename", "Duplicate", "Move to trash"] as const;

function KeyboardPathExample(): React.ReactElement {
  const [status, setStatus] = React.useState("No action chosen");
  const choose = (action: string) => (): void => setStatus(`${action}: Quarterly report.pdf`);
  return (
    <div className={storyClasses.storyRow}>
      <ContextMenu>
        <ContextMenuTrigger
          className={`${storyClasses.storyTarget} ${storyClasses.storyFile}`}
          render={
            <button
              type='button'
              onClick={choose("Open")}
            />
          }>
          Quarterly report.pdf
        </ContextMenuTrigger>
        <ContextMenuContent aria-label='Quarterly report actions'>
          {reportActions.map((action) => (
            <ContextMenuItem
              key={action}
              variant={action === "Move to trash" ? "destructive" : "default"}
              onClick={choose(action)}>
              {action}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='outline'
              size='icon'
              aria-label='More actions for Quarterly report.pdf'
            />
          }>
          <MoreHorizontal aria-hidden='true' />
        </DropdownMenuTrigger>
        <DropdownMenuContent aria-label='Quarterly report actions'>
          {reportActions.map((action) => (
            <DropdownMenuItem
              key={action}
              variant={action === "Move to trash" ? "destructive" : "default"}
              onClick={choose(action)}>
              {action}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p
        role='status'
        className={storyClasses.storyStatus}>
        {status}
      </p>
    </div>
  );
}

/**
 * Keyboard path: the trigger is a focusable, named button (Enter opens the file; the context-menu key or Shift+F10
 * opens the menu), and a visible "More actions" menu duplicates every context action for keyboards without that key.
 */
export const KeyboardPath: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Tab to the file button and press the context-menu key or Shift+F10 to open its menu, or Tab once more to the More actions button, which offers the same actions from any keyboard.",
      },
    },
  },
  render: () => <KeyboardPathExample />,
};
