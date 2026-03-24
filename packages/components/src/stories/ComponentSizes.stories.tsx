import type {Meta, StoryObj} from "storybook-react-rsbuild";

const meta = {
  title: "Foundations/Component Sizes",
  tags: ["autodocs"],
  parameters: {layout: "padded"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sizes = [
  {token: "--ac-size-xs", label: "Extra Small", value: "1.25rem / 20px"},
  {token: "--ac-size-sm", label: "Small", value: "1.5rem / 24px"},
  {token: "--ac-size-md", label: "Medium", value: "1.75rem / 28px"},
  {token: "--ac-size-default", label: "Default", value: "2rem / 32px"},
  {token: "--ac-size-lg", label: "Large", value: "2.25rem / 36px"},
];

export const Sizes: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
      <h3 style={{fontSize: 18, fontWeight: 600, borderBottom: "1px solid var(--ac-border)", paddingBottom: 8}}>Component Height Scale</h3>
      {sizes.map(({token, label, value}) => (
        <div
          key={token}
          style={{display: "flex", alignItems: "center", gap: 16}}>
          <code style={{width: 180, fontSize: 12, color: "var(--ac-muted-foreground)"}}>{token}</code>
          <div
            style={{
              height: `var(${token})`,
              width: 120,
              backgroundColor: "var(--ac-primary)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <span style={{fontSize: 11, color: "var(--ac-primary-foreground)", fontWeight: 500}}>{label}</span>
          </div>
          <span style={{fontSize: 12, color: "var(--ac-muted-foreground)"}}>{value}</span>
        </div>
      ))}
    </div>
  ),
};
