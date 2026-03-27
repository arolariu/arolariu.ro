import type {Meta, StoryObj} from "@storybook/react";

/**
 * Static visual preview of the GlobalNotFound (404) page.
 *
 * The actual component is a React Server Component that uses `headers()`,
 * `getLocale()`, `getMessages()`, and server actions, so this story
 * renders a faithful HTML replica of the 404 page with hero section,
 * QR code placeholder, and action buttons.
 */
const meta = {
  title: "Pages/Home/GlobalNotFound",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{minHeight: '100vh', backgroundColor: '#f9fafb', padding: '1rem'}}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 404 page with hero, QR code, and action buttons. */
export const Default: Story = {
  render: () => (
    <div style={{marginLeft: 'auto', marginRight: 'auto', maxWidth: '42rem', display: 'flex', flexDirection: 'column', gap: '3rem', paddingTop: '4rem', paddingBottom: '4rem'}}>
      {/* Hero Section */}
      <section style={{textAlign: 'center'}}>
        <h1 style={{fontSize: '4.5rem', fontWeight: '800', letterSpacing: '-0.025em', color: '#111827'}}>404</h1>
        <p style={{marginTop: '1rem', fontSize: '1.25rem', color: '#4b5563'}}>Page not found</p>
        <p style={{marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280'}}>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      </section>

      {/* QR Section */}
      <section style={{textAlign: 'center'}}>
        <h2 style={{fontSize: '0.875rem', fontWeight: '500', color: '#4b5563'}}>Additional Information</h2>
        <div style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '1rem', display: 'flex', height: '10rem', width: '10rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{marginLeft: 'auto', marginRight: 'auto', display: 'grid', height: '6rem', width: '6rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.125rem'}}>
              {Array.from({length: 9}).map((_, i) => (
                <div
                  key={i}
                  style={{borderRadius: '0.125rem', backgroundColor: i % 2 === 0 ? '#1f2937' : '#ffffff'}}
                />
              ))}
            </div>
            <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af'}}>Diagnostics QR</p>
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section style={{textAlign: 'center'}}>
        <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Think this is an error?</p>
        <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.75rem'}}>
          <button style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '0.625rem', paddingBottom: '0.625rem', fontSize: '0.875rem', fontWeight: '500', backgroundColor: 'transparent', cursor: 'pointer'}}>
            Submit Error Report
          </button>
          <button style={{borderRadius: '0.375rem', backgroundColor: '#111827', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '0.625rem', paddingBottom: '0.625rem', fontSize: '0.875rem', fontWeight: '500', color: '#ffffff', border: 'none', cursor: 'pointer'}}>
            Return to Homepage
          </button>
        </div>
      </section>
    </div>
  ),
};
