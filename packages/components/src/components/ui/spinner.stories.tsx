import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Spinner} from "./spinner";

const meta = {
  title: "Components/Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Spinner className='h-8 w-8' />,
};

export const Small: Story = {
  render: () => <Spinner className='h-4 w-4' />,
};

export const Medium: Story = {
  render: () => <Spinner className='h-8 w-8' />,
};

export const Large: Story = {
  render: () => <Spinner className='h-16 w-16' />,
};

/**
 * Spinner inside a loading button.
 */
export const InButton: Story = {
  render: () => (
    <button
      type='button'
      disabled
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        background: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "not-allowed",
        opacity: 0.8,
      }}>
      <Spinner style={{width: "16px", height: "16px"}} />
      <span>Processing...</span>
    </button>
  ),
};

/**
 * Spinner with accompanying label text.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "12px"}}>
      <Spinner style={{width: "40px", height: "40px"}} />
      <div style={{fontSize: "14px", color: "#6b7280"}}>Loading your content...</div>
    </div>
  ),
};
