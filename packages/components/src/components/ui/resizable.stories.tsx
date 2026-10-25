import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";
const storyStyles = `
.ac-story-resizable-storyFrame {
  width: min(100%, 48rem);
  height: 20rem;
  overflow: hidden;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
}

.ac-story-resizable-storyPanel {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background-color: var(--ac-muted);
  color: var(--ac-foreground);
  text-align: center;
}

.ac-story-resizable-storyPanelAlternate {
  background-color: var(--ac-background);
}

.ac-story-resizable-storyDescription {
  color: var(--ac-muted-foreground);
  font-size: 0.875rem;
}
`;

const storyClasses = {
  storyFrame: "ac-story-resizable-storyFrame",
  storyPanel: "ac-story-resizable-storyPanel",
  storyPanelAlternate: "ac-story-resizable-storyPanelAlternate",
  storyDescription: "ac-story-resizable-storyDescription",
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
  title: "Components/Layout/Resizable",
  component: ResizablePanelGroup,
  subcomponents: {ResizablePanel, ResizableHandle},
  tags: ["autodocs"],
  args: {orientation: "horizontal"},
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
      description: "Panel layout direction. The separator's ARIA orientation is perpendicular to the group.",
    },
    disabled: {control: "boolean"},
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "react-resizable-panels v4 Group/Panel/Separator composition. Drag a separator or focus it and use the arrow keys, Home or End. Each handle also renders −/+ step buttons after the separator (two extra tab stops) as the single-pointer alternative to dragging; withControls={false} omits them. Percentage sizes use strings; numeric sizes use pixels. DOM refs use elementRef; imperative refs use groupRef/panelRef.",
      },
    },
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;
/**
 * Native −/+ step buttons are the single-pointer alternative to dragging and add two tab stops per handle; they sit
 * clear of the separator's drag area. Separator arrow/Home/End keys remain SDK-owned.
 */
export const LocalizedClickControls: Story = {
  render: () => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup orientation='horizontal'>
        <ResizablePanel defaultSize='50%'>First panel</ResizablePanel>
        <ResizableHandle
          aria-label='Resize panels'
          decreaseLabel='Réduire le panneau précédent'
          increaseLabel='Agrandir le panneau précédent'
          resizeStep={5}
          withHandle
        />
        <ResizablePanel defaultSize='50%'>Second panel</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** Side-by-side panels with a vertical separator and an optional visual grip. */
export const Horizontal: Story = {
  args: {orientation: "horizontal"},
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='50%'>
          <div className={storyClasses.storyPanel}>First panel</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize side-by-side panels'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Second panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A bounded-height vertical group with the actual horizontal separator and rotated grip. */
export const Vertical: Story = {
  args: {orientation: "vertical"},
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='50%'>
          <div className={storyClasses.storyPanel}>Top panel</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize stacked panels'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Bottom panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** Three panels demonstrate two keyboard-accessible separators. */
export const ThreeColumn: Story = {
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='25%'>
          <div className={storyClasses.storyPanel}>Sidebar</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize sidebar'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Main content</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize details panel'
        />
        <ResizablePanel defaultSize='25%'>
          <div className={storyClasses.storyPanel}>Details</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A constrained panel uses percentage strings for v4 minimum/maximum sizing. */
export const WithMinMax: Story = {
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel
          defaultSize='30%'
          minSize='20%'
          maxSize='40%'>
          <div className={storyClasses.storyPanel}>
            <strong>Constrained panel</strong>
            <span className={storyClasses.storyDescription}>Min: 20% | Max: 40%</span>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize constrained panel'
        />
        <ResizablePanel>
          <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Flexible panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** Enter collapses/expands the sidebar; dragging past its minimum also collapses it. */
export const Collapsible: Story = {
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel
          defaultSize='25%'
          minSize='15%'
          collapsedSize='0%'
          collapsible>
          <div className={storyClasses.storyPanel}>
            <strong>Collapsible sidebar</strong>
            <span className={storyClasses.storyDescription}>Focus the separator and press Enter.</span>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize or collapse sidebar'
        />
        <ResizablePanel>
          <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Main content</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A nested vertical group demonstrates perpendicular separator styling without an extra sizing API. */
export const NestedPanels: Story = {
  render: (args) => (
    <div className={storyClasses.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='30%'>
          <div className={storyClasses.storyPanel}>Left sidebar</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize sidebar and content'
        />
        <ResizablePanel defaultSize='70%'>
          <ResizablePanelGroup orientation='vertical'>
            <ResizablePanel defaultSize='60%'>
              <div className={cn(storyClasses.storyPanel, storyClasses.storyPanelAlternate)}>Top panel</div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label='Resize nested stacked panels'
            />
            <ResizablePanel defaultSize='40%'>
              <div className={storyClasses.storyPanel}>Bottom panel</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
