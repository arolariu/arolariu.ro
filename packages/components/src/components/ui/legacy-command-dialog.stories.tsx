import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "./command";
import {LegacyCommandDialog} from "./legacy-command-dialog";

const meta = {
  title: "Components/Compatibility/LegacyCommandDialog",
  component: LegacyCommandDialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Deprecated automatic-root adapter for old direct compound children. New consumers use CommandDialog with an explicit Command root.",
      },
    },
  },
} satisfies Meta<typeof LegacyCommandDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The old direct-child contract, deliberately separated from the canonical shell. */
export const DirectChildren: Story = {
  args: {defaultOpen: true, title: "Legacy command menu", description: "Search the old direct-child palette.", showCloseButton: true},
  render: (args) => (
    <LegacyCommandDialog {...args}>
      <CommandInput aria-label='Search legacy commands' />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading='Actions'>
          <CommandItem value='open'>Open document</CommandItem>
          <CommandItem value='save'>Save document</CommandItem>
        </CommandGroup>
      </CommandList>
    </LegacyCommandDialog>
  ),
};
