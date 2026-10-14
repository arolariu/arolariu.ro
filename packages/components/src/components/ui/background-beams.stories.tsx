import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {BackgroundBeams} from "./background-beams";
const storyStyles = `
.ac-story-background-beams-demo {
  position: relative;
  height: 24rem;
  overflow: hidden;
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-background-beams-demoContent {
  position: relative;
  z-index: 1;
  display: grid;
  place-content: center;
  gap: 1rem;
  min-height: 100%;
  padding: 2rem;
}

.ac-story-background-beams-demoPair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.ac-story-background-beams-demoFullScreen {
  position: relative;
  height: 100svh;
  overflow: hidden;
  background: var(--ac-background);
  color: var(--ac-foreground);
}
`;

const storyClasses = {
  demo: "ac-story-background-beams-demo",
  demoContent: "ac-story-background-beams-demoContent",
  demoPair: "ac-story-background-beams-demoPair",
  demoFullScreen: "ac-story-background-beams-demoFullScreen",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Backgrounds/BackgroundBeams",
  component: BackgroundBeams,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Scoped SVG beams. Reduced motion, offscreen content and hidden documents use a static composition; only decorative SVG is hidden from assistive technology.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <BackgroundBeams {...args} />
    </div>
  ),
} satisfies Meta<typeof BackgroundBeams>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Animated decorative beams with foreground content preserved inside the root. */
export const Default: Story = {
  args: {children: <h2 className={storyClasses.demoContent}>Background beams</h2>},
};
/** Independent instances must not share radial or linear paint IDs. */
export const MultipleInstances: Story = {
  render: () => (
    <div className={storyClasses.demoPair}>
      <div className={storyClasses.demo}>
        <BackgroundBeams>
          <h2 className={storyClasses.demoContent}>First instance</h2>
        </BackgroundBeams>
      </div>
      <div className={storyClasses.demo}>
        <BackgroundBeams>
          <h2 className={storyClasses.demoContent}>Second instance</h2>
        </BackgroundBeams>
      </div>
    </div>
  ),
};
/** Verify a static beam composition using the OS reduced-motion setting. */
export const WithContent: Story = {
  args: {
    children: (
      <div className={storyClasses.demoContent}>
        <h2>Foreground content</h2>
        <button type='button'>Native action</button>
      </div>
    ),
  },
};

/** Full-height composition, retaining the original fullscreen demonstration. */
export const FullScreen: Story = {
  render: (args) => (
    <div className={storyClasses.demoFullScreen}>
      <BackgroundBeams {...args}>
        <h2 className={storyClasses.demoContent}>Full screen beams</h2>
      </BackgroundBeams>
    </div>
  ),
};
