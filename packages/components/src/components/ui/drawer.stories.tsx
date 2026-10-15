import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
const storyStyles = `
.ac-story-drawer-storyContent {
  display: flex;
  flex-direction: column;
  gap: var(--ac-space-4);
  padding: var(--ac-space-4);
}

.ac-story-drawer-storyActions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ac-space-2);
}

.ac-story-drawer-scrollArea {
  min-height: 0;
  max-height: 60dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
`;

const storyClasses = {
  storyContent: "ac-story-drawer-storyContent",
  storyActions: "ac-story-drawer-storyActions",
  scrollArea: "ac-story-drawer-scrollArea",
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
  title: "Components/Feedback/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    swipeDirection: {control: "select", options: ["down", "up", "left", "right"]},
    modal: {control: "select", options: [true, false, "trap-focus"]},
    showSwipeHandle: {control: "boolean"},
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default drawer sliding from the bottom with form content.
 */
export const Default: Story = {
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button />}>Open Drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Profile</DrawerTitle>
          <DrawerDescription>Make changes to your profile here. Click save when you're done.</DrawerDescription>
        </DrawerHeader>
        <div className={storyClasses.storyContent}>
          <p>Drawer content goes here.</p>
        </div>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <DrawerClose render={<Button variant='outline' />}>Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer with a drag handle indicator for mobile-friendly interaction.
 */
export const WithHandle: Story = {
  render: () => (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button />}>Open Settings</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Configure your preferences and options.</DrawerDescription>
        </DrawerHeader>
        <div className={storyClasses.storyContent}>
          <div className={storyClasses.storyActions}>
            <span>Notifications</span>
            <Button
              variant='outline'
              size='sm'>
              Enable
            </Button>
          </div>
          <div className={storyClasses.storyActions}>
            <span>Dark Mode</span>
            <Button
              variant='outline'
              size='sm'>
              Toggle
            </Button>
          </div>
          <div className={storyClasses.storyActions}>
            <span>Auto-save</span>
            <Button
              variant='outline'
              size='sm'>
              On
            </Button>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant='outline' />}>Close settings</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer with longer content to demonstrate scrollable behavior.
 */
export const WithScrollableContent: Story = {
  render: () => (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button />}>View Details</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Product Information</DrawerTitle>
          <DrawerDescription>Detailed specifications and features.</DrawerDescription>
        </DrawerHeader>
        <div className={storyClasses.scrollArea}>
          <section>
            <h3>Features</h3>
            <ul>
              <li>High-quality materials</li>
              <li>Durable construction</li>
              <li>Eco-friendly production</li>
              <li>1-year warranty</li>
              <li>Free shipping worldwide</li>
            </ul>
          </section>
          <section>
            <h3>Specifications</h3>
            <ul>
              <li>Weight: 1.2kg</li>
              <li>Dimensions: 30cm x 20cm x 10cm</li>
              <li>Color: Multiple options available</li>
              <li>Material: Premium fabric</li>
              <li>Made in: USA</li>
            </ul>
          </section>
          <section>
            <h3>Care Instructions</h3>
            <p>Machine washable at 30°C. Do not bleach. Tumble dry on low heat.</p>
          </section>
        </div>
        <DrawerFooter>
          <Button>Add to Cart</Button>
          <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer without footer for read-only content.
 */
export const WithoutFooter: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button />}>Show Information</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Welcome!</DrawerTitle>
          <DrawerDescription>Thank you for joining our platform.</DrawerDescription>
        </DrawerHeader>
        <div className={storyClasses.storyContent}>
          <p>We're excited to have you here. Explore the features and let us know if you need any help getting started.</p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * A horizontal drawer preserves native navigation links.
 */
export const WithNavigation: Story = {
  render: () => (
    <Drawer
      swipeDirection='left'
      showSwipeHandle>
      <DrawerTrigger render={<Button />}>Open Menu</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Main Menu</DrawerTitle>
          <DrawerDescription>Navigate to different sections.</DrawerDescription>
        </DrawerHeader>
        <nav
          className={storyClasses.storyContent}
          aria-label='Drawer navigation'>
          <a href='#home'>Home</a>
          <a href='#profile'>Profile</a>
          <a href='#settings'>Settings</a>
          <a href='#documentation'>Documentation</a>
        </nav>
        <DrawerFooter>
          <DrawerClose render={<Button variant='outline' />}>Close menu</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer that opens another nested drawer demonstrating stacked drawers.
 */
function NestedDrawerDemo(): React.ReactElement {
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button />}>Open Primary Drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Primary Drawer</DrawerTitle>
          <DrawerDescription>This drawer can open another drawer.</DrawerDescription>
        </DrawerHeader>
        <div className={storyClasses.storyContent}>
          <p>Click the button below to open a nested drawer on top of this one.</p>
          <Drawer
            showSwipeHandle
            swipeDirection='right'>
            <DrawerTrigger render={<Button />}>Open Nested Drawer</DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nested Drawer</DrawerTitle>
                <DrawerDescription>This is a drawer opened from within another drawer.</DrawerDescription>
              </DrawerHeader>
              <div className={storyClasses.storyContent}>
                <p>You can have multiple layers of drawers. Close this one to return to the primary drawer.</p>
              </div>
              <DrawerFooter>
                <DrawerClose render={<Button />}>Close Nested Drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant='outline' />}>Close Primary Drawer</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export const Nested: Story = {
  render: () => <NestedDrawerDemo />,
};

/** Four directions use the same real viewport/controller, with axis-specific presentation. */
export const Directions: Story = {
  render: () => (
    <div className={storyClasses.storyActions}>
      {(["down", "up", "left", "right"] as const).map((direction) => (
        <Drawer
          key={direction}
          swipeDirection={direction}
          showSwipeHandle>
          <DrawerTrigger render={<Button variant='outline' />}>Open {direction}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{direction} drawer</DrawerTitle>
              <DrawerDescription>Drag the handle along the drawer axis, or close with the button.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose render={<Button variant='outline' />}>Close {direction}</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  ),
};

/** No backdrop or page scroll lock; outside content remains interactive. */
export const NonModal: Story = {
  args: {modal: false, swipeDirection: "right", showSwipeHandle: true},
  render: (args) => (
    <div className={storyClasses.storyContent}>
      <label>
        Outside input <input placeholder='Still usable while the drawer is open' />
      </label>
      <Drawer {...args}>
        <DrawerTrigger render={<Button />}>Open nonmodal drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Nonmodal drawer</DrawerTitle>
          <DrawerDescription>The background stays interactive and scrollable.</DrawerDescription>
          <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
        </DrawerContent>
      </Drawer>
    </div>
  ),
};

/** Focus containment without a blocking backdrop or document scroll lock. */
export const TrapFocus: Story = {
  args: {modal: "trap-focus", showSwipeHandle: true},
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button />}>Open focus-trapped drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>Focus-trapped drawer</DrawerTitle>
        <DrawerDescription>Tab stays inside; the document remains scrollable.</DrawerDescription>
        <input aria-label='Inside input' />
        <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
      </DrawerContent>
    </Drawer>
  ),
};

function SnapPointsDemo(): React.ReactElement {
  const [snapPoint, setSnapPoint] = React.useState<Drawer.Props["snapPoint"]>(0.35);
  return (
    <Drawer
      snapPoints={[0.35, 0.7, 1]}
      snapPoint={snapPoint}
      onSnapPointChange={setSnapPoint}
      snapToSequentialPoints
      showSwipeHandle>
      <DrawerTrigger render={<Button />}>Open snapping drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>Snap points</DrawerTitle>
        <DrawerDescription>This demo explicitly supplies three snap heights; the component has no snap-point defaults.</DrawerDescription>
        <output>Active snap: {snapPoint}</output>
        <div className={storyClasses.storyActions}>
          <Button onClick={() => setSnapPoint(0.35)}>35%</Button>
          <Button onClick={() => setSnapPoint(0.7)}>70%</Button>
          <Button onClick={() => setSnapPoint(1)}>Expand</Button>
        </div>
        <DrawerFooter>
          <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** Consumer-controlled snap state; Base UI resolves heights and swipe requests. */
export const SnapPoints: Story = {
  render: () => <SnapPointsDemo />,
};

/** A separately composed decorative handle outside Content, owned by the same primitive Viewport. */
export const SeparateSwipeHandle: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button />}>Open custom handle drawer</DrawerTrigger>
      <DrawerContent
        render={(props) => (
          <section {...props}>
            <DrawerSwipeHandle aria-label='Decorative drag handle' />
            {props.children}
          </section>
        )}>
        <DrawerTitle>Custom handle composition</DrawerTitle>
        <DrawerDescription>The handle is decorative; all gestures still come from Base UI.</DrawerDescription>
        <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
      </DrawerContent>
    </Drawer>
  ),
};
