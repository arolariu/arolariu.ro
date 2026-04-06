import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";

const meta = {
  title: "Components/Layout/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Horizontal resizable panels.
 */
export const Horizontal: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-[200px] max-w-md rounded-lg border'>
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Panel One</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Panel Two</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Vertical resizable panels.
 */
export const Vertical: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='vertical'
      className='min-h-[400px] max-w-md rounded-lg border'>
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Top Panel</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Bottom Panel</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Three-column layout with resizable panels.
 */
export const ThreeColumn: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-[200px] max-w-2xl rounded-lg border'>
      <ResizablePanel defaultSize='25%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Sidebar</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='50%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Main Content</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='25%'>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Details</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Panels with minimum and maximum size constraints.
 */
export const WithMinMax: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-[250px] max-w-2xl rounded-lg border'>
      <ResizablePanel
        defaultSize='30%'
        minSize='20%'
        maxSize='40%'>
        <div style={{height: "100%", padding: "24px", background: "#fef3c7"}}>
          <h4 style={{fontWeight: "600", marginBottom: "8px"}}>Constrained Panel</h4>
          <p style={{fontSize: "12px", color: "#78350f"}}>Min: 20% | Max: 40%</p>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel>
        <div style={{height: "100%", padding: "24px", background: "#dbeafe"}}>
          <h4 style={{fontWeight: "600", marginBottom: "8px"}}>Flexible Panel</h4>
          <p style={{fontSize: "12px", color: "#1e3a8a"}}>No constraints</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Collapsible panel that can shrink to zero width.
 */
export const Collapsible: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-[250px] max-w-2xl rounded-lg border'>
      <ResizablePanel
        defaultSize='25%'
        minSize='0%'
        collapsible>
        <div style={{height: "100%", padding: "24px", background: "#f3e8ff"}}>
          <h4 style={{fontWeight: "600", marginBottom: "8px", color: "#6b21a8"}}>Sidebar</h4>
          <p style={{fontSize: "12px", color: "#7c3aed"}}>This panel can collapse to zero width. Drag the handle all the way left.</p>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel>
        <div style={{height: "100%", padding: "24px"}}>
          <h4 style={{fontWeight: "600", marginBottom: "8px"}}>Main Content</h4>
          <p style={{fontSize: "14px", color: "#6b7280"}}>The main content expands when the sidebar collapses.</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

/**
 * Nested resizable panels creating a complex layout.
 */
export const NestedPanels: Story = {
  render: () => (
    <ResizablePanelGroup
      orientation='horizontal'
      className='min-h-[400px] max-w-4xl rounded-lg border'>
      <ResizablePanel defaultSize='30%'>
        <div style={{height: "100%", padding: "16px", background: "#f9fafb"}}>
          <h4 style={{fontWeight: "600", marginBottom: "8px"}}>Left Sidebar</h4>
          <p style={{fontSize: "12px", color: "#6b7280"}}>Fixed content area</p>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize='70%'>
        <ResizablePanelGroup orientation='vertical'>
          <ResizablePanel defaultSize='60%'>
            <div style={{height: "100%", padding: "16px"}}>
              <h4 style={{fontWeight: "600", marginBottom: "8px"}}>Top Panel</h4>
              <p style={{fontSize: "12px", color: "#6b7280"}}>This is a nested vertical layout</p>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize='40%'>
            <ResizablePanelGroup orientation='horizontal'>
              <ResizablePanel>
                <div style={{height: "100%", padding: "16px", background: "#fef2f2"}}>
                  <h4 style={{fontWeight: "600", marginBottom: "8px", fontSize: "14px"}}>Bottom Left</h4>
                  <p style={{fontSize: "11px", color: "#991b1b"}}>Nested horizontal</p>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel>
                <div style={{height: "100%", padding: "16px", background: "#f0fdf4"}}>
                  <h4 style={{fontWeight: "600", marginBottom: "8px", fontSize: "14px"}}>Bottom Right</h4>
                  <p style={{fontSize: "11px", color: "#166534"}}>Nested horizontal</p>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};
