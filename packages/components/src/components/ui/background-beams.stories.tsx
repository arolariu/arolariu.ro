import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {BackgroundBeams} from "./background-beams";
import styles from "./background-beams.module.css";

const meta = {
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
    <div className={styles.demo}>
      <BackgroundBeams {...args} />
    </div>
  ),
} satisfies Meta<typeof BackgroundBeams>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Animated decorative beams with foreground content preserved inside the root. */
export const Default: Story = {
  args: {children: <h2 className={styles.demoContent}>Background beams</h2>},
};
/** Independent instances must not share radial or linear paint IDs. */
export const MultipleInstances: Story = {
  render: () => (
    <div className={styles.demoPair}>
      <div className={styles.demo}>
        <BackgroundBeams>
          <h2 className={styles.demoContent}>First instance</h2>
        </BackgroundBeams>
      </div>
      <div className={styles.demo}>
        <BackgroundBeams>
          <h2 className={styles.demoContent}>Second instance</h2>
        </BackgroundBeams>
      </div>
    </div>
  ),
};
/** Verify a static beam composition using the OS reduced-motion setting. */
export const WithContent: Story = {
  args: {
    children: (
      <div className={styles.demoContent}>
        <h2>Foreground content</h2>
        <button type='button'>Native action</button>
      </div>
    ),
  },
};

/** Full-height composition, retaining the original fullscreen demonstration. */
export const FullScreen: Story = {
  render: (args) => (
    <div className={styles.demoFullScreen}>
      <BackgroundBeams {...args}>
        <h2 className={styles.demoContent}>Full screen beams</h2>
      </BackgroundBeams>
    </div>
  ),
};
