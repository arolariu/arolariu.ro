import type {Meta, StoryObj} from "@storybook/react";
import EulaShimmer from "./EULA.shimmers";

/**
 * The EULA shimmer skeleton is displayed while the EULA cookie state is
 * being resolved. It provides placeholder shapes that match the full EULA
 * card layout (shield icon, title, policy cards, cookie toggles, and
 * accept button).
 *
 * This is a pure visual skeleton with no translations or interactivity.
 */
const meta = {
  title: "Pages/Home/EulaShimmer",
  component: EulaShimmer,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
          maxWidth: "56rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          paddingTop: "5rem",
          paddingBottom: "5rem",
        }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EulaShimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default EULA skeleton shimmer state. */
export const Default: Story = {};
