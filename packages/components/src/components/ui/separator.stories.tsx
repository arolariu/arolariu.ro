import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Separator} from "./separator";

const meta = {
  title: "Components/Layout/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Horizontal separator dividing content sections.
 */
export const Horizontal: Story = {
  render: () => (
    <div className='w-64 space-y-4'>
      <div>
        <h4 className='text-sm font-medium'>Section One</h4>
        <p className='text-muted-foreground text-sm'>Content for the first section.</p>
      </div>
      <Separator orientation='horizontal' />
      <div>
        <h4 className='text-sm font-medium'>Section Two</h4>
        <p className='text-muted-foreground text-sm'>Content for the second section.</p>
      </div>
    </div>
  ),
};

/**
 * Vertical separator between inline elements.
 */
export const Vertical: Story = {
  render: () => (
    <div className='flex h-16 items-center space-x-4'>
      <div className='text-sm'>
        <p className='font-medium'>Item 1</p>
      </div>
      <Separator
        orientation='vertical'
        className='h-full'
      />
      <div className='text-sm'>
        <p className='font-medium'>Item 2</p>
      </div>
      <Separator
        orientation='vertical'
        className='h-full'
      />
      <div className='text-sm'>
        <p className='font-medium'>Item 3</p>
      </div>
    </div>
  ),
};

/**
 * Separator in a navigation menu.
 */
export const InNavigation: Story = {
  render: () => (
    <div className='w-64'>
      <div className='space-y-1'>
        <button className='hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm'>Home</button>
        <button className='hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm'>Dashboard</button>
        <button className='hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm'>Projects</button>
      </div>
      <Separator className='my-2' />
      <div className='space-y-1'>
        <button className='hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm'>Settings</button>
        <button className='hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm'>Help</button>
      </div>
    </div>
  ),
};

/**
 * Separator with centered label text.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{width: "320px"}}>
      <div style={{position: "relative", display: "flex", alignItems: "center", marginTop: "24px", marginBottom: "24px"}}>
        <Separator style={{flex: 1}} />
        <span style={{padding: "0 16px", fontSize: "14px", color: "#6b7280", fontWeight: "500"}}>OR</span>
        <Separator style={{flex: 1}} />
      </div>
    </div>
  ),
};

/**
 * Separator used as a decorative visual divider.
 */
export const Decorative: Story = {
  render: () => (
    <div style={{maxWidth: "600px"}}>
      <section style={{marginBottom: "24px"}}>
        <h3 style={{fontSize: "18px", fontWeight: "600", marginBottom: "8px"}}>Introduction</h3>
        <p style={{fontSize: "14px", color: "#6b7280", lineHeight: "1.6"}}>
          This is the first section of content. It contains important information that sets the context for what follows.
        </p>
      </section>

      <Separator
        decorative
        style={{margin: "32px 0"}}
      />

      <section>
        <h3 style={{fontSize: "18px", fontWeight: "600", marginBottom: "8px"}}>Details</h3>
        <p style={{fontSize: "14px", color: "#6b7280", lineHeight: "1.6"}}>
          This is the second section with additional details and supporting information separated visually from the introduction.
        </p>
      </section>
    </div>
  ),
};
