import type {Meta, StoryObj} from "storybook-react-rsbuild";

const meta = {
  title: "Foundations/Typography",
  tags: ["autodocs"],
  parameters: {layout: "padded"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const textSizes = [
  {token: "--ac-text-xs", label: "Extra Small", size: "0.75rem"},
  {token: "--ac-text-sm", label: "Small", size: "0.8125rem"},
  {token: "--ac-text-base", label: "Base", size: "0.875rem"},
  {token: "--ac-text-lg", label: "Large", size: "1rem"},
  {token: "--ac-text-xl", label: "Extra Large", size: "1.125rem"},
];

export const TextSizes: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: 24}}>
      <h3 style={{fontSize: 18, fontWeight: 600, borderBottom: "1px solid var(--ac-border)", paddingBottom: 8}}>Text Sizes</h3>
      {textSizes.map(({token, label, size}) => (
        <div
          key={token}
          style={{display: "flex", alignItems: "baseline", gap: 16}}>
          <code style={{width: 160, fontSize: 12, color: "var(--ac-muted-foreground)", flexShrink: 0}}>{token}</code>
          <span style={{fontSize: `var(${token})`, color: "var(--ac-foreground)"}}>
            {label} — The quick brown fox jumps over the lazy dog
          </span>
          <span style={{fontSize: 11, color: "var(--ac-muted-foreground)", flexShrink: 0}}>({size})</span>
        </div>
      ))}
    </div>
  ),
};

export const FontWeights: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
      <h3 style={{fontSize: 18, fontWeight: 600, borderBottom: "1px solid var(--ac-border)", paddingBottom: 8}}>Font Weights</h3>
      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
        <div
          key={weight}
          style={{display: "flex", alignItems: "center", gap: 16}}>
          <code style={{width: 80, fontSize: 12, color: "var(--ac-muted-foreground)"}}>{weight}</code>
          <span style={{fontSize: "1rem", fontWeight: weight, color: "var(--ac-foreground)"}}>
            The quick brown fox jumps over the lazy dog
          </span>
        </div>
      ))}
    </div>
  ),
};
