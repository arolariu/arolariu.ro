import type {Meta, StoryObj} from "@storybook/react";
import {TbBrain, TbMicrophone, TbRobot, TbSettings, TbSparkles, TbTemperature} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAI component.
 *
 * The actual component depends on `usePreferencesStore` and AI model/behavior
 * constants, so this story renders a faithful HTML replica of the AI settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAI",
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

/** Default AI settings panel. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>AI Assistant</h2>
        <p className='text-sm text-gray-500'>Configure your AI assistant preferences.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Model Selection */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbRobot className='h-4 w-4' />
            <h3 className='font-semibold'>AI Model</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose the AI model for analysis.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>GPT-4o</div>
          <div className='mt-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
            <p className='text-sm font-medium'>GPT-4o</p>
            <p className='text-xs text-gray-500'>Most capable model with vision and reasoning</p>
          </div>
        </div>

        {/* Behavior */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbSparkles className='h-4 w-4' />
            <h3 className='font-semibold'>Behavior</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Set the AI communication style.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>Detailed</div>
          <p className='mt-1 text-xs text-gray-400'>Thorough explanations and analysis</p>
        </div>

        {/* Temperature */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbTemperature className='h-4 w-4' />
            <h3 className='font-semibold'>Temperature</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Balance between precision and creativity.</p>
          <div className='mt-3'>
            <div className='flex justify-between text-xs text-gray-500'>
              <span>Precise</span>
              <span>0.7</span>
              <span>Creative</span>
            </div>
            <div className='mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700'>
              <div className='h-full w-[70%] rounded-full bg-blue-600' />
            </div>
          </div>
        </div>

        {/* Max Tokens */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbSettings className='h-4 w-4' />
            <h3 className='font-semibold'>Max Tokens</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Control response length.</p>
          <div className='mt-3'>
            <div className='flex justify-between text-xs text-gray-500'>
              <span>512</span>
              <span>2048</span>
              <span>4096</span>
            </div>
            <div className='mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700'>
              <div className='h-full w-1/2 rounded-full bg-blue-600' />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbBrain className='h-4 w-4' />
            <h3 className='font-semibold'>Features</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Enable AI capabilities.</p>
          <div className='mt-3 space-y-3'>
            {[
              {label: "Auto Suggest", hint: "Get suggestions as you type", enabled: true},
              {label: "Context Awareness", hint: "Use invoice data for better answers", enabled: true},
              {label: "Memory", hint: "Remember conversation history", enabled: false},
            ].map((f) => (
              <div
                key={f.label}
                className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>{f.label}</p>
                  <p className='text-xs text-gray-400'>{f.hint}</p>
                </div>
                <div className={`h-5 w-9 rounded-full ${f.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbMicrophone className='h-4 w-4' />
            <h3 className='font-semibold'>Voice</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Voice input settings.</p>
          <div className='mt-3 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Voice Input</p>
              <p className='text-xs text-gray-400'>Use microphone for queries</p>
            </div>
            <div className='h-5 w-9 rounded-full bg-gray-200 dark:bg-gray-700' />
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
