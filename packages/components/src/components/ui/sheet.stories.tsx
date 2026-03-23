import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger} from "./sheet";

const meta = {
  title: "Components/Feedback/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default sheet sliding from the right side (default behavior).
 */
export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger>Open Sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>Make changes to your profile here. Click save when you're done.</SheetDescription>
        </SheetHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <label
              htmlFor='name'
              className='text-right text-sm font-medium'>
              Name
            </label>
            <input
              id='name'
              defaultValue='John Doe'
              className='border-input bg-background col-span-3 rounded-md border px-3 py-2 text-sm'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <label
              htmlFor='username'
              className='text-right text-sm font-medium'>
              Username
            </label>
            <input
              id='username'
              defaultValue='@johndoe'
              className='border-input bg-background col-span-3 rounded-md border px-3 py-2 text-sm'
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type='submit'>Save changes</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * Sheet sliding from the left side.
 */
export const FromLeft: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger>Open from Left</SheetTrigger>
      <SheetContent side='left'>
        <SheetHeader>
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Browse through the available sections.</SheetDescription>
        </SheetHeader>
        <nav className='mt-4 space-y-2'>
          <Button
            variant='ghost'
            className='w-full justify-start'>
            Dashboard
          </Button>
          <Button
            variant='ghost'
            className='w-full justify-start'>
            Projects
          </Button>
          <Button
            variant='ghost'
            className='w-full justify-start'>
            Team
          </Button>
          <Button
            variant='ghost'
            className='w-full justify-start'>
            Settings
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * Sheet sliding from the top.
 */
export const FromTop: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger>Open from Top</SheetTrigger>
      <SheetContent side='top'>
        <SheetHeader>
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>Find what you're looking for.</SheetDescription>
        </SheetHeader>
        <div className='py-4'>
          <input
            type='search'
            placeholder='Type to search...'
            className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'
          />
          <div className='mt-4 space-y-2'>
            <div className='rounded-md border p-3 text-sm'>Result 1</div>
            <div className='rounded-md border p-3 text-sm'>Result 2</div>
            <div className='rounded-md border p-3 text-sm'>Result 3</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  ),
};

/**
 * Sheet sliding from the bottom.
 */
export const FromBottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger>Open from Bottom</SheetTrigger>
      <SheetContent side='bottom'>
        <SheetHeader>
          <SheetTitle>Share</SheetTitle>
          <SheetDescription>Share this content with others.</SheetDescription>
        </SheetHeader>
        <div className='grid grid-cols-4 gap-4 py-4'>
          <Button
            variant='outline'
            className='h-auto flex-col gap-2 py-4'>
            <svg
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
              />
            </svg>
            <span className='text-xs'>Email</span>
          </Button>
          <Button
            variant='outline'
            className='h-auto flex-col gap-2 py-4'>
            <svg
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'
              />
            </svg>
            <span className='text-xs'>Copy Link</span>
          </Button>
          <Button
            variant='outline'
            className='h-auto flex-col gap-2 py-4'>
            <svg
              className='h-6 w-6'
              fill='currentColor'
              viewBox='0 0 24 24'>
              <path d='M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' />
            </svg>
            <span className='text-xs'>Twitter</span>
          </Button>
          <Button
            variant='outline'
            className='h-auto flex-col gap-2 py-4'>
            <svg
              className='h-6 w-6'
              fill='currentColor'
              viewBox='0 0 24 24'>
              <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
            </svg>
            <span className='text-xs'>Facebook</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  ),
};
