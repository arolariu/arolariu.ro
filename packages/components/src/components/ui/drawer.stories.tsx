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

/**
 * Drawer showing a navigation menu with icon buttons.
 */
export const WithNavigation: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger>Open Menu</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Main Menu</DrawerTitle>
          <DrawerDescription>Navigate to different sections.</DrawerDescription>
        </DrawerHeader>
        <nav style={{padding: "16px", display: "flex", flexDirection: "column", gap: "8px"}}>
          {[
            {
              icon: (
                <svg
                  style={{width: "20px", height: "20px"}}
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                  />
                </svg>
              ),
              label: "Home",
            },
            {
              icon: (
                <svg
                  style={{width: "20px", height: "20px"}}
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              ),
              label: "Profile",
            },
            {
              icon: (
                <svg
                  style={{width: "20px", height: "20px"}}
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                </svg>
              ),
              label: "Settings",
            },
            {
              icon: (
                <svg
                  style={{width: "20px", height: "20px"}}
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
              ),
              label: "Documentation",
            },
          ].map((item, idx) => (
            <button
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant='outline'>Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/**
 * Drawer that opens another nested drawer demonstrating stacked drawers.
 */
function NestedDrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger>Open Primary Drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Primary Drawer</DrawerTitle>
          <DrawerDescription>This drawer can open another drawer.</DrawerDescription>
        </DrawerHeader>
        <div style={{padding: "16px"}}>
          <p style={{fontSize: "14px", color: "#6b7280", marginBottom: "16px"}}>
            Click the button below to open a nested drawer on top of this one.
          </p>
          <Drawer>
            <DrawerTrigger asChild>
              <Button>Open Nested Drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nested Drawer</DrawerTitle>
                <DrawerDescription>This is a drawer opened from within another drawer.</DrawerDescription>
              </DrawerHeader>
              <div style={{padding: "16px"}}>
                <p style={{fontSize: "14px", color: "#6b7280"}}>
                  You can have multiple layers of drawers. Close this one to return to the primary drawer.
                </p>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button>Close Nested Drawer</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant='outline'>Close Primary Drawer</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export const Nested: Story = {
  render: () => <NestedDrawerDemo />,
};
