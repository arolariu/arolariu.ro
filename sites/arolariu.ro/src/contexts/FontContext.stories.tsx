import type {Meta, StoryObj} from "@storybook/react";
import {FontContextProvider, useFontContext} from "./FontContext";

/**
 * The FontContext provides application-wide font management with support for
 * normal (Caudex) and dyslexic-friendly (Atkinson Hyperlegible) fonts.
 *
 * This story demonstrates the font switching functionality via a demo component.
 */
const meta = {
  title: "Site/FontContext",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Demo component that uses the FontContext to switch fonts. */
function FontSwitcherDemo(): React.JSX.Element {
  const {fontType, fontClassName, setFont} = useFontContext();

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '1.5rem'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
        <h2 style={{fontSize: '1.125rem', fontWeight: '700'}}>Font Context Demo</h2>
        <p style={{fontSize: '0.875rem', color: '#6b7280'}}>
          Current font: <code style={{borderRadius: '0.25rem', backgroundColor: '#f3f4f6', paddingLeft: '0.25rem', paddingRight: '0.25rem', paddingTop: '0.125rem', paddingBottom: '0.125rem'}}>{fontType}</code>
        </p>
        <p style={{fontSize: '0.875rem', color: '#6b7280'}}>
          Class name: <code style={{borderRadius: '0.25rem', backgroundColor: '#f3f4f6', paddingLeft: '0.25rem', paddingRight: '0.25rem', paddingTop: '0.125rem', paddingBottom: '0.125rem'}}>{fontClassName}</code>
        </p>
      </div>
      <div style={{display: 'flex', gap: '0.75rem'}}>
        <button
          type='button'
          onClick={() => setFont("normal")}
          style={{
            borderRadius: '0.375rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: fontType === "normal" ? 'none' : '1px solid #d1d5db',
            backgroundColor: fontType === "normal" ? '#2563eb' : '#ffffff',
            color: fontType === "normal" ? '#ffffff' : '#374151',
            cursor: 'pointer'
          }}>
          Normal Font
        </button>
        <button
          type='button'
          onClick={() => setFont("dyslexic")}
          style={{
            borderRadius: '0.375rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            border: fontType === "dyslexic" ? 'none' : '1px solid #d1d5db',
            backgroundColor: fontType === "dyslexic" ? '#2563eb' : '#ffffff',
            color: fontType === "dyslexic" ? '#ffffff' : '#374151',
            cursor: 'pointer'
          }}>
          Dyslexic Font
        </button>
      </div>
      <div style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '1rem'}}>
        <p className={fontClassName}>
          The quick brown fox jumps over the lazy dog. This text changes font based on the selected preference.
        </p>
      </div>
    </div>
  );
}

/** Interactive font switcher showing both font options. */
export const FontSwitcher: Story = {
  render: () => (
    <FontContextProvider>
      <FontSwitcherDemo />
    </FontContextProvider>
  ),
};
