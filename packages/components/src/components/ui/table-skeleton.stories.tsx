import {useEffect, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {TableSkeleton} from "./table-skeleton";
import {VisuallyHidden} from "./visually-hidden";
const storyStyles = `
.ac-story-table-skeleton-storyPreview {
  width: 48rem;
  max-width: 100%;
}

.ac-story-table-skeleton-storyPanel {
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg);
  background-color: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-table-skeleton-storyHeading {
  margin: 0 0 var(--ac-space-4);
  font-size: 1.25rem;
  font-weight: 600;
}
`;

const storyClasses = {
  storyPreview: "ac-story-table-skeleton-storyPreview",
  storyPanel: "ac-story-table-skeleton-storyPanel",
  storyHeading: "ac-story-table-skeleton-storyHeading",
} as const;

/**
 * Caller-owned announcement: a persistent visually hidden status region is mounted empty and receives the localized
 * `loadingAnnouncement` story parameter (in `loadingAnnouncementLang`, when set) once loading begins. The skeleton
 * itself stays decorative.
 */
function LoadingAnnouncement({
  message,
  lang,
  children,
}: Readonly<{message: string; lang: string | undefined; children: React.ReactNode}>): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
  }, []);
  return (
    <>
      <VisuallyHidden
        role='status'
        lang={lang}>
        {loading ? message : null}
      </VisuallyHidden>
      {children}
    </>
  );
}

const meta = {
  title: "Components/Feedback/TableSkeleton",
  component: TableSkeleton,
  tags: ["autodocs"],
  parameters: {
    loadingAnnouncement: "Loading records",
    docs: {
      description: {
        component:
          "Decorative table placeholders. Each story writes its localized loading message into a persistent visually hidden status region after that region mounts; the skeleton never carries a role or label.",
      },
    },
  },
  decorators: [
    (Story, {parameters}) => {
      const {loadingAnnouncement, loadingAnnouncementLang}: Readonly<Record<string, unknown>> = parameters;
      return (
        <LoadingAnnouncement
          message={typeof loadingAnnouncement === "string" ? loadingAnnouncement : ""}
          lang={typeof loadingAnnouncementLang === "string" ? loadingAnnouncementLang : undefined}>
          <Story />
        </LoadingAnnouncement>
      );
    },

    (Story) => (
      <div className={storyClasses.storyPreview}>
        <Story />
      </div>
    ),

    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  argTypes: {
    rows: {
      control: {type: "range", min: 0, max: 20, step: 1},
      description: "Rows: integer 0–10,000; total cells including the header must be ≤10,000. Demo slider limited to 20.",
    },
    columns: {
      control: {type: "range", min: 0, max: 10, step: 1},
      description: "Columns: integer 0–10,000; total cells including the header must be ≤10,000. Demo slider limited to 10.",
    },
    showHeader: {control: "boolean", description: "Show the decorative header; its cells contribute to the total limit"},
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
  },
} satisfies Meta<typeof TableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Table skeleton with default dimensions.
 */
export const Default: Story = {
  args: {
    rows: 5,
    columns: 4,
  },
};

/**
 * Compact table skeleton.
 */
export const Compact: Story = {
  args: {
    rows: 3,
    columns: 3,
  },
};

/**
 * Wide table skeleton with many columns.
 */
export const Wide: Story = {
  args: {
    rows: 5,
    columns: 8,
  },
};

/** Body placeholders without a header. */
export const WithoutHeader: Story = {
  args: {showHeader: false},
};

/** Zero body rows preserve the decorative header. */
export const HeaderOnly: Story = {
  args: {rows: 0},
};

/** Zero columns preserve empty row shapes, without pretending to be a table. */
export const ZeroColumns: Story = {
  args: {columns: 0, rows: 3},
};

/** Both axes may be zero; the optional header can be omitted too. */
export const Empty: Story = {
  args: {rows: 0, columns: 0, showHeader: false},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/** The announcement is caller-owned text, so it follows the page language. */
export const LocalizedAnnouncement: Story = {
  args: {rows: 5, columns: 4},
  parameters: {loadingAnnouncement: "Se încarcă înregistrările", loadingAnnouncementLang: "ro"},
};

/**
 * Table skeleton in a container; the visible heading is ordinary text, not the announcement.
 */
export const InContainer: Story = {
  render: () => (
    <section className={storyClasses.storyPanel}>
      <h2 className={storyClasses.storyHeading}>Loading records</h2>
      <TableSkeleton
        rows={8}
        columns={5}
      />
    </section>
  ),
};
