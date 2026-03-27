import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Commander component renders a command palette (Ctrl+K) dialog.
 *
 * Since it depends on `useFontContext`, `usePreferencesStore`, `useTheme`,
 * and `useRouter`, this story shows the **visual structure** of the command
 * palette items without requiring all providers.
 */
const meta = {
  title: "Site/Commander",
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

/** Static representation of the command palette UI. */
export const Preview: Story = {
  render: () => (
    <div style={{width: '100%', maxWidth: '32rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem'}}>
        <input
          type='text'
          placeholder='Type a command or search...'
          style={{width: '100%', backgroundColor: 'transparent', fontSize: '0.875rem', color: '#111827', outline: 'none', border: 'none'}}
          readOnly
        />
      </div>
      <div style={{overflowY: 'auto', padding: '0.5rem'}}>
        <p style={{paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280'}}>Navigation</p>
        <div style={{display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          <span>🏠</span>
          <span>Homepage</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af'}}>H</span>
        </div>
        <div style={{marginTop: '0.25rem', marginBottom: '0.25rem', height: '1px', backgroundColor: '#e5e7eb'}} />
        <p style={{paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280'}}>Theme</p>
        <div style={{display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          <span>☀️</span>
          <span>Light</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af'}}>L</span>
        </div>
        <div style={{display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          <span>🌙</span>
          <span>Dark</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af'}}>D</span>
        </div>
        <div style={{marginTop: '0.25rem', marginBottom: '0.25rem', height: '1px', backgroundColor: '#e5e7eb'}} />
        <p style={{paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280'}}>Language</p>
        <div style={{display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          <span>🌐</span>
          <span>English</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af'}}>EN</span>
        </div>
        <div style={{display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          <span>🌐</span>
          <span>Romanian</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af'}}>RO</span>
        </div>
      </div>
    </div>
  ),
};

/** Empty state when no results match the query. */
export const EmptyState: Story = {
  render: () => (
    <div style={{width: '100%', maxWidth: '32rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem'}}>
        <input
          type='text'
          defaultValue='nonexistent command'
          style={{width: '100%', backgroundColor: 'transparent', fontSize: '0.875rem', color: '#111827', outline: 'none', border: 'none'}}
          readOnly
        />
      </div>
      <div style={{paddingTop: '1.5rem', paddingBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280'}}>No results found.</div>
    </div>
  ),
};
