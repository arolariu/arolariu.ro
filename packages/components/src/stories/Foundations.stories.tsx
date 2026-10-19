import type {Meta, StoryObj} from "storybook-react-rsbuild";
import "../index.css";
const storyStyles = `
.ac-story-foundations-swatchRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.ac-story-foundations-swatch {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid var(--ac-border);
  flex-shrink: 0;
}

.ac-story-foundations-tokenLabel {
  font-weight: 600;
  font-size: 14px;
}

.ac-story-foundations-tokenName {
  font-size: 12px;
  color: var(--ac-muted-foreground);
}

.ac-story-foundations-groups {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ac-story-foundations-groupHeading {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--ac-border);
  padding-bottom: 8px;
}

.ac-story-foundations-colorGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

.ac-story-foundations-spacingList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ac-story-foundations-spacingHeading {
  font-size: 18px;
  font-weight: 600;
}

.ac-story-foundations-spacingRow {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ac-story-foundations-spacingName {
  width: 140px;
  font-size: 12px;
  color: var(--ac-muted-foreground);
}

.ac-story-foundations-spacingBar {
  height: 24px;
  background-color: var(--ac-primary);
  border-radius: 4px;
  min-width: 4px;
}

.ac-story-foundations-radiusList {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.ac-story-foundations-radiusItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ac-story-foundations-radiusSwatch {
  width: 64px;
  height: 64px;
  background-color: var(--ac-primary);
}

.ac-story-foundations-radiusName {
  font-size: 11px;
  color: var(--ac-muted-foreground);
}
`;

const storyClasses = {
  swatchRow: "ac-story-foundations-swatchRow",
  swatch: "ac-story-foundations-swatch",
  tokenLabel: "ac-story-foundations-tokenLabel",
  tokenName: "ac-story-foundations-tokenName",
  groups: "ac-story-foundations-groups",
  groupHeading: "ac-story-foundations-groupHeading",
  colorGrid: "ac-story-foundations-colorGrid",
  spacingList: "ac-story-foundations-spacingList",
  spacingHeading: "ac-story-foundations-spacingHeading",
  spacingRow: "ac-story-foundations-spacingRow",
  spacingName: "ac-story-foundations-spacingName",
  spacingBar: "ac-story-foundations-spacingBar",
  radiusList: "ac-story-foundations-radiusList",
  radiusItem: "ac-story-foundations-radiusItem",
  radiusSwatch: "ac-story-foundations-radiusSwatch",
  radiusName: "ac-story-foundations-radiusName",
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
    {name: "--ac-primary-emphasis", label: "Primary Emphasis"},
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
    <div className={storyClasses.swatchRow}>
      <div
        className={storyClasses.swatch}
        style={{backgroundColor: `var(${name})`}}
      />
      <div>
        <div className={storyClasses.tokenLabel}>{label}</div>
        <code className={storyClasses.tokenName}>{name}</code>
      </div>
    </div>
  );
}

export const Colors: Story = {
  render: () => (
    <div className={storyClasses.groups}>
      {Object.entries(tokenGroups).map(([group, tokens]) => (
        <div key={group}>
          <h3 className={storyClasses.groupHeading}>{group}</h3>
          <div className={storyClasses.colorGrid}>
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
    <div className={storyClasses.spacingList}>
      <h3 className={storyClasses.spacingHeading}>Spacing Scale</h3>
      {spacingTokens.map((token) => (
        <div
          key={token}
          className={storyClasses.spacingRow}>
          <code className={storyClasses.spacingName}>{token}</code>
          <div
            className={storyClasses.spacingBar}
            style={{width: `var(${token})`}}
          />
        </div>
      ))}
    </div>
  ),
};

const radiusTokens = ["--ac-radius-xs", "--ac-radius-sm", "--ac-radius-md", "--ac-radius-lg", "--ac-radius-xl"];

export const BorderRadius: Story = {
  render: () => (
    <div className={storyClasses.radiusList}>
      {radiusTokens.map((token) => (
        <div
          key={token}
          className={storyClasses.radiusItem}>
          <div
            className={storyClasses.radiusSwatch}
            style={{borderRadius: `var(${token})`}}
          />
          <code className={storyClasses.radiusName}>{token.replace("--ac-radius-", "")}</code>
        </div>
      ))}
    </div>
  ),
};
