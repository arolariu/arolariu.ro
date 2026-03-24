import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Skeleton} from "./skeleton";

const meta = {
  title: "Components/Feedback/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className='space-y-2'>
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-5/6' />
      <Skeleton className='h-4 w-4/5' />
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className='space-y-3 rounded border p-4'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-5/6' />
      </div>
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className='space-y-4'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='flex items-center space-x-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        </div>
      ))}
    </div>
  ),
};

/**
 * Multiple skeleton lines simulating paragraph text.
 */
export const Paragraph: Story = {
  render: () => (
    <div style={{maxWidth: "600px", padding: "16px"}}>
      <Skeleton style={{height: "24px", width: "40%", marginBottom: "16px"}} />
      <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        <Skeleton style={{height: "16px", width: "100%"}} />
        <Skeleton style={{height: "16px", width: "95%"}} />
        <Skeleton style={{height: "16px", width: "98%"}} />
        <Skeleton style={{height: "16px", width: "92%"}} />
        <Skeleton style={{height: "16px", width: "85%"}} />
      </div>
    </div>
  ),
};

/**
 * Profile skeleton with avatar, name, and bio lines.
 */
export const Profile: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", maxWidth: "400px"}}>
      <Skeleton style={{width: "96px", height: "96px", borderRadius: "50%", marginBottom: "16px"}} />
      <Skeleton style={{height: "20px", width: "120px", marginBottom: "8px"}} />
      <Skeleton style={{height: "14px", width: "80px", marginBottom: "16px"}} />
      <div style={{width: "100%", display: "flex", flexDirection: "column", gap: "8px"}}>
        <Skeleton style={{height: "12px", width: "100%"}} />
        <Skeleton style={{height: "12px", width: "90%"}} />
        <Skeleton style={{height: "12px", width: "75%"}} />
      </div>
    </div>
  ),
};

/**
 * Complex dashboard skeleton combining cards, charts, and stats.
 */
export const Dashboard: Story = {
  render: () => (
    <div style={{padding: "24px", maxWidth: "1200px"}}>
      {/* Header */}
      <div style={{marginBottom: "24px"}}>
        <Skeleton style={{height: "32px", width: "200px", marginBottom: "8px"}} />
        <Skeleton style={{height: "16px", width: "300px"}} />
      </div>

      {/* Stats Cards */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px"}}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px"}}>
            <Skeleton style={{height: "14px", width: "60%", marginBottom: "12px"}} />
            <Skeleton style={{height: "28px", width: "40%", marginBottom: "8px"}} />
            <Skeleton style={{height: "12px", width: "80px"}} />
          </div>
        ))}
      </div>

      {/* Chart and Table */}
      <div style={{display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px"}}>
        {/* Chart Area */}
        <div style={{padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px"}}>
          <Skeleton style={{height: "20px", width: "150px", marginBottom: "16px"}} />
          <Skeleton style={{height: "300px", width: "100%"}} />
        </div>

        {/* Activity List */}
        <div style={{padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px"}}>
          <Skeleton style={{height: "20px", width: "120px", marginBottom: "16px"}} />
          <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{display: "flex", alignItems: "center", gap: "12px"}}>
                <Skeleton style={{width: "40px", height: "40px", borderRadius: "50%"}} />
                <div style={{flex: 1}}>
                  <Skeleton style={{height: "14px", width: "100%", marginBottom: "4px"}} />
                  <Skeleton style={{height: "12px", width: "60%"}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};
