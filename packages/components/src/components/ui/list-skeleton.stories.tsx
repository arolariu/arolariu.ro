import {useEffect, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {ListSkeleton} from "./list-skeleton";
import {VisuallyHidden} from "./visually-hidden";
const storyStyles = `
.ac-story-list-skeleton-storyPreview {
  width: 36rem;
  max-width: 100%;
}

.ac-story-list-skeleton-storyPanel {
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg);
  background-color: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-list-skeleton-storyHeading {
  margin: 0 0 var(--ac-space-4);
  font-size: 1.25rem;
  font-weight: 600;
}
`;

const storyClasses = {
  storyPreview: "ac-story-list-skeleton-storyPreview",
  storyPanel: "ac-story-list-skeleton-storyPanel",
  storyHeading: "ac-story-list-skeleton-storyHeading",
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
  title: "Components/Feedback/ListSkeleton",
  component: ListSkeleton,
  tags: ["autodocs"],
  parameters: {
    loadingAnnouncement: "Loading results",
    docs: {
      description: {
        component:
          "Decorative list placeholders. Each story writes its localized loading message into a persistent visually hidden status region after that region mounts; the skeleton never carries a role or label.",
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
    items: {
      control: {type: "range", min: 0, max: 20, step: 1},
      description: "Items: integer 0–10,000; invalid values throw RangeError. This demo limits the slider to 20.",
    },
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
    showAvatar: {
      control: "boolean",
      description: "Whether each item should render a leading circular avatar placeholder",
    },
  },
} satisfies Meta<typeof ListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * List skeleton with default 5 items and avatars.
 */
export const Default: Story = {
  args: {
    items: 5,
    showAvatar: true,
  },
};

/**
 * List skeleton without avatars.
 */
export const NoAvatars: Story = {
  args: {
    items: 5,
    showAvatar: false,
  },
};

/**
 * Long list skeleton with many items.
 */
export const LongList: Story = {
  args: {
    items: 12,
    showAvatar: true,
  },
};

/** Zero items render an empty layout; the caller-owned status region still carries the loading message. */
export const Empty: Story = {
  args: {items: 0},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/** The announcement is caller-owned text, so it follows the page language. */
export const LocalizedAnnouncement: Story = {
  args: {items: 5},
  parameters: {loadingAnnouncement: "Se încarcă rezultatele", loadingAnnouncementLang: "ro"},
};

/**
 * List skeleton in a container; the visible heading is ordinary text, not the announcement.
 */
export const InContainer: Story = {
  render: () => (
    <section className={storyClasses.storyPanel}>
      <h2 className={storyClasses.storyHeading}>Loading results</h2>
      <ListSkeleton
        items={6}
        showAvatar
      />
    </section>
  ),
};
