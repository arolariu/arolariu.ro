import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
const storyStyles = `
.ac-story-motion-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ac-story-motion-heading {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.ac-story-motion-toggle {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--ac-border);
  background-color: var(--ac-primary);
  color: var(--ac-primary-foreground);
  cursor: pointer;
  margin-bottom: 24px;
}

.ac-story-motion-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ac-story-motion-tokenName {
  width: 200px;
  font-size: 12px;
  color: var(--ac-muted-foreground);
}

.ac-story-motion-preview {
  height: 48px;
  background-color: var(--ac-primary);
  border-radius: 8px;
}
`;

const storyClasses = {
  list: "ac-story-motion-list",
  heading: "ac-story-motion-heading",
  toggle: "ac-story-motion-toggle",
  row: "ac-story-motion-row",
  tokenName: "ac-story-motion-tokenName",
  preview: "ac-story-motion-preview",
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
  title: "Foundations/Motion",
  tags: ["autodocs"],
  parameters: {layout: "padded"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const transitions = [
  {token: "--ac-transition-fast", label: "Fast", duration: "100ms"},
  {token: "--ac-transition-normal", label: "Normal", duration: "150ms"},
  {token: "--ac-transition-slow", label: "Slow", duration: "200ms"},
];

export const Transitions: Story = {
  render: () => {
    const [active, setActive] = React.useState(false);
    return (
      <div className={storyClasses.list}>
        <div>
          <h3 className={storyClasses.heading}>Transition Durations</h3>
          <button
            type='button'
            onClick={() => setActive(!active)}
            className={storyClasses.toggle}>
            Toggle Animation
          </button>
        </div>
        {transitions.map(({token, duration}) => (
          <div
            key={token}
            className={storyClasses.row}>
            <code className={storyClasses.tokenName}>
              {token} ({duration})
            </code>
            <div
              className={storyClasses.preview}
              style={{width: active ? 200 : 48, transition: `width var(${token})`}}
            />
          </div>
        ))}
      </div>
    );
  },
};
