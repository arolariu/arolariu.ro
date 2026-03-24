import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";

const meta = {
  title: "Components/Overlays/Popover",
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

/**
 * Popover containing a small form with inputs.
 */
function PopoverWithForm(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger>
        <Button>Settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div style={{display: "flex", flexDirection: "column", gap: "12px", padding: "16px"}}>
          <h3 style={{fontWeight: 600}}>Settings</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
            <label style={{fontSize: "14px", display: "flex", flexDirection: "column", gap: "4px"}}>
              Width
              <input
                type='number'
                style={{
                  marginTop: "4px",
                  width: "100%",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  padding: "4px 8px",
                }}
                defaultValue={300}
              />
            </label>
            <label style={{fontSize: "14px", display: "flex", flexDirection: "column", gap: "4px"}}>
              Height
              <input
                type='number'
                style={{
                  marginTop: "4px",
                  width: "100%",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  padding: "4px 8px",
                }}
                defaultValue={200}
              />
            </label>
          </div>
          <Button size='sm'>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const WithForm: Story = {
  render: () => <PopoverWithForm />,
};

/**
 * Popover with custom right-side placement alignment.
 */
export const CustomPlacement: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger>
        <Button variant='outline'>Open Right</Button>
      </PopoverTrigger>
      <PopoverContent side='right'>
        <div style={{padding: "16px"}}>
          <h3 style={{fontWeight: 600, marginBottom: "8px"}}>Right Side Popover</h3>
          <p style={{fontSize: "14px"}}>This popover appears on the right side of the trigger.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

/**
 * Nested popover demonstration (popover inside popover).
 */
function NestedPopover(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant='outline'>Open Outer</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div style={{padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
          <h3 style={{fontWeight: 600}}>Outer Popover</h3>
          <p style={{fontSize: "14px"}}>This is the outer popover content.</p>
          <Popover>
            <PopoverTrigger>
              <Button size='sm' variant='secondary'>Open Inner</Button>
            </PopoverTrigger>
            <PopoverContent>
              <div style={{padding: "16px"}}>
                <h4 style={{fontWeight: 600, fontSize: "14px", marginBottom: "8px"}}>Inner Popover</h4>
                <p style={{fontSize: "12px"}}>This is a nested popover!</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const Nested: Story = {
  render: () => <NestedPopover />,
};
