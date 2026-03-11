import type {Meta, StoryObj} from "@storybook/react";
import {TbBrush, TbGlobe, TbMoon, TbPalette, TbSettings, TbSun, TbTypography} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAppearance component.
 *
 * The actual component depends on `useFontContext`, `usePreferencesStore`,
 * `useTheme`, and various Zustand store actions, so this story renders
 * a faithful HTML replica of the appearance settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAppearance",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='p-6'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default appearance settings with theme, font, locale, and advanced options. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>Appearance</h2>
        <p className='text-sm text-gray-500'>Customize the look and feel of your experience.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Theme Card */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbBrush className='h-4 w-4' />
            <h3 className='font-semibold'>Theme</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose your preferred color scheme.</p>
          <div className='mt-3 flex gap-2'>
            {[
              {icon: <TbSun className='mr-1.5 h-4 w-4' />, label: "Light", active: true},
              {icon: <TbMoon className='mr-1.5 h-4 w-4' />, label: "Dark", active: false},
              {icon: <TbSettings className='mr-1.5 h-4 w-4' />, label: "System", active: false},
            ].map((t) => (
              <button
                key={t.label}
                className={`flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm ${
                  t.active ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "border"
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Card */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbTypography className='h-4 w-4' />
            <h3 className='font-semibold'>Font</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose a font that works best for you.</p>
          <div className='mt-3 flex gap-2'>
            <button className='flex-1 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
              Normal
            </button>
            <button className='flex-1 rounded-md border px-3 py-1.5 text-sm'>Dyslexic</button>
          </div>
          <p className='mt-2 text-xs text-gray-400'>OpenDyslexic font improves readability.</p>
        </div>

        {/* Theme Presets Card */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbPalette className='h-4 w-4' />
            <h3 className='font-semibold'>Theme Presets</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Quick-apply a curated color palette.</p>
          <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4'>
            {[
              {name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#3b82f6"]},
              {name: "Sunset", colors: ["#f97316", "#ef4444", "#eab308"]},
              {name: "Forest", colors: ["#22c55e", "#14b8a6", "#10b981"]},
              {name: "Custom", colors: ["#8b5cf6", "#ec4899", "#6366f1"]},
            ].map((p) => (
              <button
                key={p.name}
                className='rounded-lg border p-3 text-center text-xs'>
                <div className='mb-2 flex justify-center gap-1'>
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      className='h-4 w-4 rounded-full'
                      style={{backgroundColor: c}}
                    />
                  ))}
                </div>
                <span className='font-medium'>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Card */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbGlobe className='h-4 w-4' />
            <h3 className='font-semibold'>Language</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose your display language.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>English (EN)</div>
        </div>

        {/* Advanced Options Card */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbSettings className='h-4 w-4' />
            <h3 className='font-semibold'>Advanced</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Fine-tune your experience.</p>
          <div className='mt-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Compact Mode</p>
                <p className='text-xs text-gray-400'>Reduce spacing for denser layouts.</p>
              </div>
              <div className='h-5 w-9 rounded-full bg-gray-200 dark:bg-gray-700' />
            </div>
            <hr className='dark:border-gray-700' />
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Animations</p>
                <p className='text-xs text-gray-400'>Enable smooth transitions.</p>
              </div>
              <div className='h-5 w-9 rounded-full bg-blue-600' />
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  ...Default,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
