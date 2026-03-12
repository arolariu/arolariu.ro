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
  component: undefined as never,
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
    <div className='space-y-6 rounded-lg border border-gray-200 p-6 dark:border-gray-700'>
      <div className='space-y-2'>
        <h2 className='text-lg font-bold'>Font Context Demo</h2>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Current font: <code className='rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800'>{fontType}</code>
        </p>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Class name: <code className='rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800'>{fontClassName}</code>
        </p>
      </div>
      <div className='flex gap-3'>
        <button
          type='button'
          onClick={() => setFont("normal")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            fontType === "normal"
              ? "bg-blue-600 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          }`}>
          Normal Font
        </button>
        <button
          type='button'
          onClick={() => setFont("dyslexic")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            fontType === "dyslexic"
              ? "bg-blue-600 text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          }`}>
          Dyslexic Font
        </button>
      </div>
      <div className='rounded-md border border-gray-200 p-4 dark:border-gray-700'>
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
