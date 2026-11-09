import type {Meta, StoryObj} from "storybook-react-rsbuild";
const storyStyles = `
.ac-story-typography-sizes {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ac-story-typography-heading {
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--ac-border);
  padding-bottom: 8px;
}

.ac-story-typography-sizeRow {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.ac-story-typography-tokenName {
  width: 160px;
  font-size: 12px;
  color: var(--ac-muted-foreground);
  flex-shrink: 0;
}

.ac-story-typography-sample {
  color: var(--ac-foreground);
}

.ac-story-typography-sizeHint {
  font-size: 11px;
  color: var(--ac-muted-foreground);
  flex-shrink: 0;
}

.ac-story-typography-weights {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ac-story-typography-weightHeading {
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--ac-border);
  padding-bottom: 8px;
}

.ac-story-typography-weightRow {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ac-story-typography-weightName {
  width: 80px;
  font-size: 12px;
  color: var(--ac-muted-foreground);
}

.ac-story-typography-weightSample {
  font-size: 1rem;
  color: var(--ac-foreground);
}
`;

const storyClasses = {
  sizes: "ac-story-typography-sizes",
  heading: "ac-story-typography-heading",
  sizeRow: "ac-story-typography-sizeRow",
  tokenName: "ac-story-typography-tokenName",
  sample: "ac-story-typography-sample",
  sizeHint: "ac-story-typography-sizeHint",
  weights: "ac-story-typography-weights",
  weightHeading: "ac-story-typography-weightHeading",
  weightRow: "ac-story-typography-weightRow",
  weightName: "ac-story-typography-weightName",
  weightSample: "ac-story-typography-weightSample",
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
    <div className={storyClasses.sizes}>
      <h3 className={storyClasses.heading}>Text Sizes</h3>
      {textSizes.map(({token, label, size}) => (
        <div
          key={token}
          className={storyClasses.sizeRow}>
          <code className={storyClasses.tokenName}>{token}</code>
          <span
            className={storyClasses.sample}
            style={{fontSize: `var(${token})`}}>
            {label} — The quick brown fox jumps over the lazy dog
          </span>
          <span className={storyClasses.sizeHint}>({size})</span>
        </div>
      ))}
    </div>
  ),
};

export const FontWeights: Story = {
  render: () => (
    <div className={storyClasses.weights}>
      <h3 className={storyClasses.weightHeading}>Font Weights</h3>
      {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
        <div
          key={weight}
          className={storyClasses.weightRow}>
          <code className={storyClasses.weightName}>{weight}</code>
          <span
            className={storyClasses.weightSample}
            style={{fontWeight: weight}}>
            The quick brown fox jumps over the lazy dog
          </span>
        </div>
      ))}
    </div>
  ),
};
