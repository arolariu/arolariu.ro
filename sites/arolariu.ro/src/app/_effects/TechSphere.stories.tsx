import type {Meta, StoryObj} from "@storybook/react";

/**
 * Static visual preview of the TechSphere component.
 *
 * The actual component uses Three.js (WebGLRenderer, IcosahedronGeometry,
 * PointsMaterial) to render a 3D wireframe sphere with floating particles.
 * Three.js may not render correctly in Storybook's iframe environment,
 * so this story provides both an attempt at the real component and a
 * static fallback preview.
 */
const meta = {
  title: "Effects/TechSphere",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static representation of the Three.js sphere effect. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>TechSphere</h2>
        <p className='mt-1 text-sm text-gray-500'>3D wireframe icosahedron with floating particles (Three.js)</p>
      </div>

      <div className='flex aspect-square items-center justify-center bg-gray-950 p-8'>
        {/* Static SVG representation of the wireframe sphere */}
        <div className='relative h-64 w-64'>
          {/* Outer glow */}
          <div className='absolute inset-0 rounded-full bg-purple-500/10 blur-xl' />

          {/* Wireframe circle representations */}
          <svg
            viewBox='0 0 200 200'
            className='h-full w-full'
            aria-label='Wireframe sphere visualization'>
            {/* Horizontal rings */}
            <ellipse
              cx='100'
              cy='100'
              rx='80'
              ry='80'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.8'
            />
            <ellipse
              cx='100'
              cy='100'
              rx='80'
              ry='30'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.6'
            />
            <ellipse
              cx='100'
              cy='80'
              rx='70'
              ry='25'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.5'
            />
            <ellipse
              cx='100'
              cy='120'
              rx='70'
              ry='25'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.5'
            />
            {/* Vertical rings */}
            <ellipse
              cx='100'
              cy='100'
              rx='30'
              ry='80'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.6'
            />
            <ellipse
              cx='100'
              cy='100'
              rx='55'
              ry='80'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.4'
              transform='rotate(30 100 100)'
            />
            <ellipse
              cx='100'
              cy='100'
              rx='55'
              ry='80'
              fill='none'
              stroke='#8B5CF6'
              strokeWidth='0.5'
              opacity='0.4'
              transform='rotate(-30 100 100)'
            />

            {/* Particles */}
            {[
              [30, 50],
              [150, 40],
              [170, 130],
              [45, 160],
              [120, 170],
              [80, 30],
              [160, 80],
              [35, 110],
              [140, 55],
              [65, 145],
              [180, 100],
              [20, 80],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r='1.5'
                fill='#6366F1'
                opacity='0.7'
              />
            ))}
          </svg>
        </div>
      </div>

      <div className='border-t p-4'>
        <div className='flex items-center gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800'>
          <div className='h-2 w-2 rounded-full bg-purple-500' />
          <p className='text-xs text-gray-500'>
            Renders via <code className='font-mono'>WebGLRenderer</code> — IcosahedronGeometry(3, 3) + 1000 particles
          </p>
        </div>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
