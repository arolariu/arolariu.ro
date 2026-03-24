import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

const meta = {
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
      <div style={{display: "flex", flexDirection: "column", gap: 32}}>
        <div>
          <h3 style={{fontSize: 18, fontWeight: 600, marginBottom: 16}}>Transition Durations</h3>
          <button
            type='button'
            onClick={() => setActive(!active)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--ac-border)",
              backgroundColor: "var(--ac-primary)",
              color: "var(--ac-primary-foreground)",
              cursor: "pointer",
              marginBottom: 24,
            }}>
            Toggle Animation
          </button>
        </div>
        {transitions.map(({token, label, duration}) => (
          <div
            key={token}
            style={{display: "flex", alignItems: "center", gap: 16}}>
            <code style={{width: 200, fontSize: 12, color: "var(--ac-muted-foreground)"}}>
              {token} ({duration})
            </code>
            <div
              style={{
                width: active ? 200 : 48,
                height: 48,
                backgroundColor: "var(--ac-primary)",
                borderRadius: 8,
                transition: `width var(${token})`,
              }}
            />
          </div>
        ))}
      </div>
    );
  },
};
