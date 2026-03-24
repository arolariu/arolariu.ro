import type {Meta, StoryObj} from "storybook-react-rsbuild";
import "../index.css";

const meta = {
  title: "Foundations/Design Tokens",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const tokenGroups = {
  "Semantic Colors": [
    {name: "--ac-background", label: "Background"},
    {name: "--ac-foreground", label: "Foreground"},
    {name: "--ac-primary", label: "Primary"},
    {name: "--ac-primary-foreground", label: "Primary Foreground"},
    {name: "--ac-secondary", label: "Secondary"},
    {name: "--ac-secondary-foreground", label: "Secondary Foreground"},
    {name: "--ac-muted", label: "Muted"},
    {name: "--ac-muted-foreground", label: "Muted Foreground"},
    {name: "--ac-accent", label: "Accent"},
    {name: "--ac-accent-foreground", label: "Accent Foreground"},
    {name: "--ac-destructive", label: "Destructive"},
    {name: "--ac-border", label: "Border"},
    {name: "--ac-ring", label: "Ring"},
  ],
  "Status Colors": [
    {name: "--ac-success", label: "Success"},
    {name: "--ac-warning", label: "Warning"},
    {name: "--ac-info", label: "Info"},
  ],
  "Chart Colors": [
    {name: "--ac-chart-1", label: "Chart 1"},
    {name: "--ac-chart-2", label: "Chart 2"},
    {name: "--ac-chart-3", label: "Chart 3"},
    {name: "--ac-chart-4", label: "Chart 4"},
    {name: "--ac-chart-5", label: "Chart 5"},
  ],
};

function ColorSwatch({name, label}: {name: string; label: string}) {
  return (
    <div style={{display: "flex", alignItems: "center", gap: 12, padding: "8px 0"}}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: `var(${name})`,
          border: "1px solid var(--ac-border)",
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{fontWeight: 600, fontSize: 14}}>{label}</div>
        <code style={{fontSize: 12, color: "var(--ac-muted-foreground)"}}>{name}</code>
      </div>
    </div>
  );
}

export const Colors: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: 32}}>
      {Object.entries(tokenGroups).map(([group, tokens]) => (
        <div key={group}>
          <h3 style={{marginBottom: 12, fontSize: 18, fontWeight: 600, borderBottom: "1px solid var(--ac-border)", paddingBottom: 8}}>
            {group}
          </h3>
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8}}>
            {tokens.map((t) => (
              <ColorSwatch
                key={t.name}
                {...t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

const spacingTokens = ["--ac-space-1", "--ac-space-2", "--ac-space-3", "--ac-space-4", "--ac-space-6", "--ac-space-8"];

export const Spacing: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
      <h3 style={{fontSize: 18, fontWeight: 600}}>Spacing Scale</h3>
      {spacingTokens.map((token) => (
        <div
          key={token}
          style={{display: "flex", alignItems: "center", gap: 16}}>
          <code style={{width: 140, fontSize: 12, color: "var(--ac-muted-foreground)"}}>{token}</code>
          <div
            style={{
              height: 24,
              width: `var(${token})`,
              backgroundColor: "var(--ac-primary)",
              borderRadius: 4,
              minWidth: 4,
            }}
          />
        </div>
      ))}
    </div>
  ),
};

const radiusTokens = ["--ac-radius-xs", "--ac-radius-sm", "--ac-radius-md", "--ac-radius-lg", "--ac-radius-xl"];

export const BorderRadius: Story = {
  render: () => (
    <div style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
      {radiusTokens.map((token) => (
        <div
          key={token}
          style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 8}}>
          <div
            style={{
              width: 64,
              height: 64,
              backgroundColor: "var(--ac-primary)",
              borderRadius: `var(${token})`,
            }}
          />
          <code style={{fontSize: 11, color: "var(--ac-muted-foreground)"}}>{token.replace("--ac-radius-", "")}</code>
        </div>
      ))}
    </div>
  ),
};
