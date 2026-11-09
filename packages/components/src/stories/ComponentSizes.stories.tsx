import type {Meta, StoryObj} from "storybook-react-rsbuild";
const storyStyles = `
.ac-story-component-sizes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ac-story-component-sizes-heading {
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--ac-border);
  padding-bottom: 8px;
}

.ac-story-component-sizes-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ac-story-component-sizes-tokenName {
  width: 180px;
  font-size: 12px;
  color: var(--ac-muted-foreground);
}

.ac-story-component-sizes-preview {
  width: 120px;
  background-color: var(--ac-primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ac-story-component-sizes-label {
  font-size: 11px;
  color: var(--ac-primary-foreground);
  font-weight: 500;
}

.ac-story-component-sizes-value {
  font-size: 12px;
  color: var(--ac-muted-foreground);
}
`;

const storyClasses = {
  list: "ac-story-component-sizes-list",
  heading: "ac-story-component-sizes-heading",
  row: "ac-story-component-sizes-row",
  tokenName: "ac-story-component-sizes-tokenName",
  preview: "ac-story-component-sizes-preview",
  label: "ac-story-component-sizes-label",
  value: "ac-story-component-sizes-value",
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
    <div className={storyClasses.list}>
      <h3 className={storyClasses.heading}>Component Height Scale</h3>
      {sizes.map(({token, label, value}) => (
        <div
          key={token}
          className={storyClasses.row}>
          <code className={storyClasses.tokenName}>{token}</code>
          <div
            className={storyClasses.preview}
            style={{height: `var(${token})`}}>
            <span className={storyClasses.label}>{label}</span>
          </div>
          <span className={storyClasses.value}>{value}</span>
        </div>
      ))}
    </div>
  ),
};
