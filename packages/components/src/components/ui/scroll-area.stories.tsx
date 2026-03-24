import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ScrollArea, ScrollBar} from "./scroll-area";
import {Separator} from "./separator";

const meta = {
  title: "Components/Layout/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default scroll area with vertical scrolling.
 */
export const Default: Story = {
  render: () => (
    <ScrollArea className='h-[200px] w-[350px] rounded-md border p-4'>
      <div className='space-y-4'>
        <h4 className='mb-4 text-sm leading-none font-medium'>Tags</h4>
        {Array.from({length: 50}, (_, i) => `Tag ${i + 1}`).map((tag) => (
          <div
            key={tag}
            className='text-sm'>
            {tag}
            <Separator className='my-2' />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/**
 * Scroll area with horizontal scrolling.
 */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className='w-96 rounded-md border whitespace-nowrap'>
      <div className='flex w-max space-x-4 p-4'>
        {Array.from({length: 20}, (_, i) => (
          <figure
            key={`figure-${i + 1}`}
            className='shrink-0'>
            <div className='bg-muted h-[120px] w-[150px] overflow-hidden rounded-md' />
            <figcaption className='text-muted-foreground pt-2 text-xs'>
              Photo {i + 1}
              <span className='text-foreground ml-1 font-semibold'>by Artist</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};

/**
 * Scroll area with both horizontal and vertical scrolling.
 */
export const BothDirections: Story = {
  render: () => (
    <ScrollArea className='h-[300px] w-[400px] rounded-md border p-4'>
      <div className='w-[600px]'>
        <h4 className='mb-4 text-sm leading-none font-medium'>Wide Content</h4>
        {Array.from({length: 30}, (_, i) => (
          <div
            key={`row-${i + 1}`}
            className='text-sm'>
            This is a very long line of text that extends beyond the visible width of the scroll area. Row {i + 1}
            <Separator className='my-2' />
          </div>
        ))}
      </div>
      <ScrollBar orientation='vertical' />
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};

/**
 * Compact scroll area for small content lists.
 */
export const Compact: Story = {
  render: () => (
    <ScrollArea className='h-[120px] w-[250px] rounded-md border p-3'>
      <div className='space-y-2'>
        {["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7", "Item 8", "Item 9", "Item 10"].map((item) => (
          <div
            key={item}
            className='text-sm'>
            {item}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/**
 * Scroll area with wide horizontal content only.
 */
export const HorizontalScroll: Story = {
  render: () => (
    <ScrollArea style={{width: "400px", borderRadius: "8px", border: "1px solid #e5e7eb"}}>
      <div style={{display: "flex", gap: "16px", padding: "16px", width: "max-content"}}>
        {Array.from({length: 15}, (_, i) => (
          <div
            key={i}
            style={{
              minWidth: "150px",
              height: "100px",
              background: `linear-gradient(135deg, ${i % 2 === 0 ? "#3b82f6" : "#8b5cf6"} 0%, ${i % 2 === 0 ? "#1e40af" : "#6d28d9"} 100%)`,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "600",
            }}>
            Card {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};

/**
 * Scroll area with both horizontal and vertical scrolling.
 */
export const BothAxes: Story = {
  render: () => (
    <ScrollArea style={{width: "400px", height: "300px", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "16px"}}>
      <div style={{width: "800px"}}>
        <h3 style={{marginBottom: "16px", fontSize: "16px", fontWeight: "600"}}>Wide and Tall Content</h3>
        <table style={{width: "100%", borderCollapse: "collapse"}}>
          <thead>
            <tr style={{background: "#f3f4f6"}}>
              <th style={{padding: "8px", textAlign: "left", border: "1px solid #e5e7eb"}}>Column A</th>
              <th style={{padding: "8px", textAlign: "left", border: "1px solid #e5e7eb"}}>Column B</th>
              <th style={{padding: "8px", textAlign: "left", border: "1px solid #e5e7eb"}}>Column C</th>
              <th style={{padding: "8px", textAlign: "left", border: "1px solid #e5e7eb"}}>Column D</th>
              <th style={{padding: "8px", textAlign: "left", border: "1px solid #e5e7eb"}}>Column E</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 20}, (_, i) => (
              <tr key={i}>
                <td style={{padding: "8px", border: "1px solid #e5e7eb"}}>Row {i + 1} - A</td>
                <td style={{padding: "8px", border: "1px solid #e5e7eb"}}>Row {i + 1} - B</td>
                <td style={{padding: "8px", border: "1px solid #e5e7eb"}}>Row {i + 1} - C</td>
                <td style={{padding: "8px", border: "1px solid #e5e7eb"}}>Row {i + 1} - D</td>
                <td style={{padding: "8px", border: "1px solid #e5e7eb"}}>Row {i + 1} - E</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation='vertical' />
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  ),
};
