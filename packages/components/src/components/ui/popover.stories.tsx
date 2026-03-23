import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";

const meta = {
  component: Popover,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>
        <Button variant='outline'>Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className='space-y-2 p-4'>
          <h3 className='font-semibold'>Popover Title</h3>
          <p className='text-sm'>This is the popover content. You can put any content here.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>
        <Button>Settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className='space-y-3 p-4'>
          <h3 className='font-semibold'>Settings</h3>
          <div className='space-y-2'>
            <label className='text-sm'>
              Width
              <input
                type='number'
                className='mt-1 w-full rounded border px-2 py-1'
                defaultValue={300}
              />
            </label>
            <label className='text-sm'>
              Height
              <input
                type='number'
                className='mt-1 w-full rounded border px-2 py-1'
                defaultValue={200}
              />
            </label>
          </div>
          <Button size='sm'>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
