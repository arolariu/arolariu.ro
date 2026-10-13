import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "./resizable";
import styles from "./resizable.module.css";

const meta = {
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
          "react-resizable-panels v4 Group/Panel/Separator composition. Drag a separator or focus it and use the arrow keys, Home or End. Percentage sizes use strings; numeric sizes use pixels. DOM refs use elementRef; imperative refs use groupRef/panelRef.",
      },
    },
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Side-by-side panels with a vertical separator and an optional visual grip. */
export const Horizontal: Story = {
  args: {orientation: "horizontal"},
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='50%'>
          <div className={styles.storyPanel}>First panel</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize side-by-side panels'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Second panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A bounded-height vertical group with the actual horizontal separator and rotated grip. */
export const Vertical: Story = {
  args: {orientation: "vertical"},
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='50%'>
          <div className={styles.storyPanel}>Top panel</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize stacked panels'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Bottom panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** Three panels demonstrate two keyboard-accessible separators. */
export const ThreeColumn: Story = {
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='25%'>
          <div className={styles.storyPanel}>Sidebar</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize sidebar'
        />
        <ResizablePanel defaultSize='50%'>
          <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Main content</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize details panel'
        />
        <ResizablePanel defaultSize='25%'>
          <div className={styles.storyPanel}>Details</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A constrained panel uses percentage strings for v4 minimum/maximum sizing. */
export const WithMinMax: Story = {
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel
          defaultSize='30%'
          minSize='20%'
          maxSize='40%'>
          <div className={styles.storyPanel}>
            <strong>Constrained panel</strong>
            <span className={styles.storyDescription}>Min: 20% | Max: 40%</span>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize constrained panel'
        />
        <ResizablePanel>
          <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Flexible panel</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** Enter collapses/expands the sidebar; dragging past its minimum also collapses it. */
export const Collapsible: Story = {
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel
          defaultSize='25%'
          minSize='15%'
          collapsedSize='0%'
          collapsible>
          <div className={styles.storyPanel}>
            <strong>Collapsible sidebar</strong>
            <span className={styles.storyDescription}>Focus the separator and press Enter.</span>
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize or collapse sidebar'
        />
        <ResizablePanel>
          <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Main content</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

/** A nested vertical group demonstrates perpendicular separator styling without an extra sizing API. */
export const NestedPanels: Story = {
  render: (args) => (
    <div className={styles.storyFrame}>
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize='30%'>
          <div className={styles.storyPanel}>Left sidebar</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label='Resize sidebar and content'
        />
        <ResizablePanel defaultSize='70%'>
          <ResizablePanelGroup orientation='vertical'>
            <ResizablePanel defaultSize='60%'>
              <div className={cn(styles.storyPanel, styles.storyPanelAlternate)}>Top panel</div>
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label='Resize nested stacked panels'
            />
            <ResizablePanel defaultSize='40%'>
              <div className={styles.storyPanel}>Bottom panel</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
