import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Navigation component provides both desktop and mobile navigation.
 *
 * Because Navigation depends on `useAuth` from Clerk, this story renders
 * **skeleton representations** of the desktop and mobile navigation states
 * to avoid requiring a full Clerk provider.
 */
const meta = {
  title: "Site/Navigation",
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop navigation skeleton showing nav items. */
export const DesktopSkeleton: Story = {
  render: () => (
    <nav style={{display: 'flex', alignItems: 'center', gap: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '0.75rem', paddingBottom: '0.75rem'}}>
      <div style={{height: '1rem', width: '5rem', borderRadius: '0.25rem', backgroundColor: '#e5e7eb'}} />
      <div style={{height: '1rem', width: '4rem', borderRadius: '0.25rem', backgroundColor: '#e5e7eb'}} />
      <div style={{height: '1rem', width: '6rem', borderRadius: '0.25rem', backgroundColor: '#e5e7eb'}} />
    </nav>
  ),
};

/** Mobile navigation trigger skeleton (hamburger button). */
export const MobileTriggerSkeleton: Story = {
  render: () => (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '1rem'}}>
      <button
        type='button'
        style={{borderRadius: '0.375rem', border: '1px solid #d1d5db', padding: '0.5rem', backgroundColor: 'transparent', cursor: 'pointer'}}
        aria-label='Open navigation'>
        <svg
          style={{height: '1.5rem', width: '1.5rem', color: '#4b5563'}}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 6h16M4 12h16M4 18h16'
          />
        </svg>
      </button>
    </div>
  ),
};

/** Full desktop navigation layout preview. */
export const DesktopPreview: Story = {
  render: () => (
    <nav style={{display: 'flex', alignItems: 'center', gap: '2rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1rem', paddingBottom: '1rem'}}>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
        Domains
      </a>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
        About
      </a>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
        My Profile
      </a>
    </nav>
  ),
};

/** Mobile navigation panel in open state. */
export const MobileOpen: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
  render: () => (
    <div style={{position: 'relative', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem'}}>
        <span style={{fontSize: '0.875rem', fontWeight: '600', color: '#111827'}}>Navigation</span>
        <button
          type='button'
          style={{borderRadius: '0.375rem', padding: '0.25rem', color: '#6b7280', backgroundColor: 'transparent', border: 'none', cursor: 'pointer'}}
          aria-label='Close navigation'>
          <svg
            style={{height: '1.25rem', width: '1.25rem'}}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
      <nav style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem'}}>
        <a
          href='#'
          style={{borderRadius: '0.375rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
          Domains
        </a>
        <a
          href='#'
          style={{borderRadius: '0.375rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
          About
        </a>
        <a
          href='#'
          style={{borderRadius: '0.375rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
          My Profile
        </a>
      </nav>
    </div>
  ),
};

/** Desktop navigation with an active route highlighted. */
export const WithActiveRoute: Story = {
  render: () => (
    <nav style={{display: 'flex', alignItems: 'center', gap: '2rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1rem', paddingBottom: '1rem'}}>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#2563eb', textDecoration: 'underline', textUnderlineOffset: '4px'}}
        aria-current='page'>
        Domains
      </a>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
        About
      </a>
      <a
        href='#'
        style={{fontSize: '0.875rem', fontWeight: '500', color: '#374151', textDecoration: 'none'}}>
        My Profile
      </a>
    </nav>
  ),
};
