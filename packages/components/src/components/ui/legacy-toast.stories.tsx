import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {LegacyToaster, legacyToast} from "./legacy-toast";
const storyStyles = `
.ac-story-legacy-toast-storyControls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ac-space-3);
}

.ac-story-legacy-toast-customBody {
  display: flex;
  align-items: center;
  gap: var(--ac-space-3);
  min-width: 0;
}
`;

const storyClasses = {
  storyControls: "ac-story-legacy-toast-storyControls",
  customBody: "ac-story-legacy-toast-customBody",
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
  title: "Components/Feedback/LegacyToast",
  component: LegacyToaster,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof LegacyToaster>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Explicit compatibility facade; the canonical toast export is not callable. */
export const Default: Story = {
  render: () => (
    <>
      <Button onClick={() => legacyToast("Event created", {description: "Saved successfully."})}>Show legacy toast</Button>
      <LegacyToaster />
    </>
  ),
};

/** Every previously demonstrated status method remains on the named legacy facade. */
export const Statuses: Story = {
  render: () => (
    <>
      <div className={storyClasses.storyControls}>
        <Button onClick={() => legacyToast.success("Saved")}>Success</Button>
        <Button onClick={() => legacyToast.error("Failed")}>Error</Button>
        <Button onClick={() => legacyToast.info("Information")}>Info</Button>
        <Button onClick={() => legacyToast.warning("Be careful")}>Warning</Button>
        <Button
          onClick={() => {
            const id = legacyToast.loading("Loading");
            setTimeout(() => {
              if (legacyToast.getToasts().some((item) => item.id === id)) {
                legacyToast.update(id, {message: "Complete", variant: "success"});
              }
            }, 1500);
          }}>
          Loading and update
        </Button>
      </div>
      <LegacyToaster />
    </>
  ),
};

/** Action/cancel callbacks retain event cancellation rather than forcing dismissal. */
export const Actions: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          legacyToast("Item removed", {
            action: {
              label: "Undo",
              onClick: () => {
                legacyToast.success("Restored");
              },
            },
            cancel: {label: "Keep open", onClick: (event) => event.preventDefault()},
          })
        }>
        Show action and cancel
      </Button>
      <LegacyToaster />
    </>
  ),
};

/** Custom rendering occurs within React and receives the actual normalized ID. */
export const Custom: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          legacyToast.custom((id) => (
            <div className={storyClasses.customBody}>
              <strong>Custom content</strong>
              <Button
                variant='outline'
                size='sm'
                onClick={() => legacyToast.dismiss(id)}>
                Dismiss
              </Button>
            </div>
          ))
        }>
        Show custom content
      </Button>
      <LegacyToaster />
    </>
  ),
};

/** Promise rejection remains rejected; the story explicitly consumes its demonstrated error. */
export const PromiseLifecycle: Story = {
  render: () => (
    <>
      <div className={storyClasses.storyControls}>
        <Button
          onClick={() => {
            void legacyToast.promise(
              new Promise<number>((resolve) => {
                setTimeout(() => resolve(0), 1500);
              }),
              {
                loading: "Working",
                success: (value) => ({message: value, description: 0}),
              },
            );
          }}>
          Resolve to zero
        </Button>
        <Button
          variant='destructive'
          onClick={() => {
            void legacyToast
              .promise(Promise.reject(new Error("Demonstrated failure")), {
                loading: "Working",
                error: (error) => (error instanceof Error ? error.message : String(error)),
              })
              .catch((): void => undefined);
          }}>
          Show handled rejection
        </Button>
      </div>
      <LegacyToaster />
    </>
  ),
};
