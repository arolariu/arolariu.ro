import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Avatar} from "./avatar";
import {Button} from "./button";
import {HoverCard, HoverCardContent, HoverCardTrigger} from "./hover-card";

const meta = {
  title: "Components/Overlays/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default hover card showing user profile information on hover.
 */
export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href='#'
        className='font-medium underline underline-offset-4'>
        @nextjs
      </HoverCardTrigger>
      <HoverCardContent className='w-80'>
        <div className='flex justify-between space-x-4'>
          <Avatar
            src='https://github.com/vercel.png'
            fallback='VC'
          />
          <div className='space-y-1'>
            <h4 className='text-sm font-semibold'>@nextjs</h4>
            <p className='text-muted-foreground text-sm'>The React Framework – created and maintained by @vercel.</p>
            <div className='flex items-center pt-2'>
              <svg
                className='mr-2 h-4 w-4 opacity-70'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
              <span className='text-muted-foreground text-xs'>Joined December 2021</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

/**
 * Hover card with minimal content showing a simple tooltip-like message.
 */
export const Simple: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href='#'
        className='font-medium underline underline-offset-4'>
        Hover over me
      </HoverCardTrigger>
      <HoverCardContent>
        <p className='text-sm'>This is additional information shown on hover.</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

/**
 * Hover card displaying product information with pricing details.
 */
export const ProductInfo: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant='link'>View Product Details</Button>
      </HoverCardTrigger>
      <HoverCardContent className='w-80'>
        <div className='space-y-2'>
          <h4 className='text-sm font-semibold'>Premium Headphones</h4>
          <p className='text-muted-foreground text-sm'>High-fidelity audio with active noise cancellation and 30-hour battery life.</p>
          <div className='flex items-center justify-between pt-2'>
            <span className='text-lg font-bold'>$299.99</span>
            <span className='rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600'>In Stock</span>
          </div>
          <div className='flex gap-2 pt-2'>
            <span className='bg-muted rounded-md px-2 py-1 text-xs'>Wireless</span>
            <span className='bg-muted rounded-md px-2 py-1 text-xs'>Bluetooth 5.0</span>
            <span className='bg-muted rounded-md px-2 py-1 text-xs'>ANC</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

/**
 * Hover card showing repository statistics and information.
 */
export const RepositoryStats: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href='#'
        className='font-medium underline underline-offset-4'>
        vercel/next.js
      </HoverCardTrigger>
      <HoverCardContent className='w-80'>
        <div className='space-y-3'>
          <div className='flex items-start justify-between'>
            <div>
              <h4 className='text-sm font-semibold'>next.js</h4>
              <p className='text-muted-foreground text-xs'>The React Framework for the Web</p>
            </div>
            <span className='bg-muted rounded-md px-2 py-1 text-xs font-medium'>Public</span>
          </div>
          <p className='text-muted-foreground text-sm'>Used by 500k+ developers to build full-stack web applications with React.</p>
          <div className='flex gap-4 text-sm'>
            <div className='flex items-center gap-1'>
              <svg
                className='h-4 w-4 text-yellow-500'
                fill='currentColor'
                viewBox='0 0 20 20'>
                <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
              </svg>
              <span className='font-medium'>120k</span>
            </div>
            <div className='flex items-center gap-1'>
              <svg
                className='h-4 w-4'
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
              <span className='font-medium'>25k</span>
            </div>
            <div className='flex items-center gap-1'>
              <div className='h-3 w-3 rounded-full bg-blue-500' />
              <span className='text-xs'>TypeScript</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

/**
 * Hover card showing a user profile with avatar, bio, and follow button.
 */
export const UserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href='#'
        style={{fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "4px"}}>
        @sarah_dev
      </HoverCardTrigger>
      <HoverCardContent style={{width: "320px"}}>
        <div style={{display: "flex", gap: "16px"}}>
          <Avatar
            src='https://i.pravatar.cc/150?img=47'
            fallback='SD'
          />
          <div style={{flex: 1, display: "flex", flexDirection: "column", gap: "8px"}}>
            <div>
              <h4 style={{fontSize: "14px", fontWeight: 600}}>Sarah Anderson</h4>
              <p style={{fontSize: "14px", color: "#6b7280"}}>@sarah_dev</p>
            </div>
            <p style={{fontSize: "14px", color: "#6b7280", lineHeight: "1.5"}}>
              Full-stack developer passionate about React, TypeScript, and building accessible web experiences. Coffee enthusiast ☕
            </p>
            <div style={{display: "flex", gap: "16px", fontSize: "14px", paddingTop: "8px"}}>
              <div>
                <span style={{fontWeight: 600}}>1,234</span> <span style={{color: "#6b7280"}}>followers</span>
              </div>
              <div>
                <span style={{fontWeight: 600}}>567</span> <span style={{color: "#6b7280"}}>following</span>
              </div>
            </div>
            <Button
              size='sm'
              style={{marginTop: "8px"}}>
              Follow
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};

/**
 * Hover card showing a link preview with title, description, and thumbnail.
 */
export const LinkPreview: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href='#'
        style={{color: "#3b82f6", textDecoration: "underline", textUnderlineOffset: "4px"}}>
        Read the full article
      </HoverCardTrigger>
      <HoverCardContent style={{width: "360px", padding: 0}}>
        <div style={{overflow: "hidden", borderRadius: "8px"}}>
          <div
            style={{
              width: "100%",
              height: "180px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "48px",
              fontWeight: 600,
            }}>
            📰
          </div>
          <div style={{padding: "16px"}}>
            <h4 style={{fontSize: "16px", fontWeight: 600, marginBottom: "8px"}}>10 Tips for Building Better React Applications</h4>
            <p style={{fontSize: "14px", color: "#6b7280", lineHeight: "1.5", marginBottom: "12px"}}>
              Learn best practices and modern patterns for building scalable, maintainable React applications. Covers hooks, performance
              optimization, and more.
            </p>
            <div style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#9ca3af"}}>
              <svg
                style={{width: "16px", height: "16px"}}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <span>5 min read</span>
              <span>•</span>
              <span>blog.example.com</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
