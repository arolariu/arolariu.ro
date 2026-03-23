import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger} from "./drawer";

const meta = {
  title: "Components/Feedback/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default drawer sliding from the bottom with form content.
 */
export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger>Open Drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Profile</DrawerTitle>
          <DrawerDescription>Make changes to your profile here. Click save when you're done.</DrawerDescription>
        </DrawerHeader>
        <div className='p-4'>
          <p className='text-muted-foreground text-sm'>Drawer content goes here.</p>
        </div>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <DrawerClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DrawerClose>
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
    <Drawer>
      <DrawerTrigger>Open Settings</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Configure your preferences and options.</DrawerDescription>
        </DrawerHeader>
        <div className='space-y-4 p-4'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Notifications</span>
            <Button
              variant='outline'
              size='sm'>
              Enable
            </Button>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Dark Mode</span>
            <Button
              variant='outline'
              size='sm'>
              Toggle
            </Button>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Auto-save</span>
            <Button
              variant='outline'
              size='sm'>
              On
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer with longer content to demonstrate scrollable behavior.
 */
export const WithScrollableContent: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger>View Details</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Product Information</DrawerTitle>
          <DrawerDescription>Detailed specifications and features.</DrawerDescription>
        </DrawerHeader>
        <div className='max-h-[60vh] space-y-4 overflow-y-auto p-4'>
          <section>
            <h3 className='mb-2 font-semibold'>Features</h3>
            <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
              <li>High-quality materials</li>
              <li>Durable construction</li>
              <li>Eco-friendly production</li>
              <li>1-year warranty</li>
              <li>Free shipping worldwide</li>
            </ul>
          </section>
          <section>
            <h3 className='mb-2 font-semibold'>Specifications</h3>
            <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
              <li>Weight: 1.2kg</li>
              <li>Dimensions: 30cm x 20cm x 10cm</li>
              <li>Color: Multiple options available</li>
              <li>Material: Premium fabric</li>
              <li>Made in: USA</li>
            </ul>
          </section>
          <section>
            <h3 className='mb-2 font-semibold'>Care Instructions</h3>
            <p className='text-muted-foreground text-sm'>Machine washable at 30°C. Do not bleach. Tumble dry on low heat.</p>
          </section>
        </div>
        <DrawerFooter>
          <Button>Add to Cart</Button>
          <DrawerClose asChild>
            <Button variant='outline'>Close</Button>
          </DrawerClose>
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
      <DrawerTrigger>Show Information</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Welcome!</DrawerTitle>
          <DrawerDescription>Thank you for joining our platform.</DrawerDescription>
        </DrawerHeader>
        <div className='p-4'>
          <p className='text-muted-foreground text-sm'>
            We're excited to have you here. Explore the features and let us know if you need any help getting started.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};
