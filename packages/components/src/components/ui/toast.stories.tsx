import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  createToastManager,
  toast,
  useToastManager,
  type ToastPosition,
} from "./toast";

const meta = {
  title: "Components/Feedback/Toast",
  component: Toaster,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Canonical shared manager: add an options object rather than calling a facade. */
export const Default: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.add({title: "Event created", description: "Saved successfully.", type: "success"})}>
        Show notification
      </Button>
      <Toaster />
    </>
  ),
};

function ScopedExample({position = "bottom-right"}: Readonly<{position?: ToastPosition}>): React.JSX.Element {
  const [manager] = React.useState(() => createToastManager());
  return (
    <Toaster
      toastManager={manager}
      position={position}
      limit={3}>
      <Button
        onClick={() => {
          for (let index = 0; index < 5; index += 1) {
            manager.add({title: `Notification ${String(index + 1)}`, description: "Hover or focus to expand.", timeout: 0});
          }
        }}>
        Show limited stack
      </Button>
    </Toaster>
  );
}

/** Overflow stays in the real manager and emits data-limited. */
export const LimitedStack: Story = {render: () => <ScopedExample />};
/** Top positions reverse stacking, entry, exit, and offset direction. */
export const TopCenter: Story = {render: () => <ScopedExample position='top-center' />};

function CompoundExample(): React.JSX.Element {
  const {add, close, toasts} = useToastManager<{origin: string}>();
  return (
    <>
      <Button
        onClick={() =>
          add({
            title: 0,
            description: 0,
            data: {origin: "compound"},
            timeout: 0,
            actionProps: {children: "Dismiss", onClick: () => close()},
          })
        }>
        Show zero-content compound toast
      </Button>
      <ToastPortal>
        <ToastViewport position='bottom-left'>
          {toasts.map((item) => (
            <Toast
              key={item.id}
              toast={item}
              swipeDirection={["left", "down"]}>
              <ToastContent>
                <div>
                  <ToastTitle />
                  <ToastDescription />
                </div>
                <ToastAction />
                <ToastClose />
              </ToastContent>
            </Toast>
          ))}
        </ToastViewport>
      </ToastPortal>
    </>
  );
}

/** All compound primitives preserve the nearest provider's state and action props. */
export const Compound: Story = {
  render: () => (
    <ToastProvider>
      <CompoundExample />
    </ToastProvider>
  ),
};

/** Base UI owns loading-to-success updates. No Sonner-like canonical methods are used. */
export const PromiseLifecycle: Story = {
  render: () => (
    <>
      <Button
        onClick={() => {
          void toast.promise(
            new Promise<string>((resolve) => {
              setTimeout(() => resolve("Complete"), 1500);
            }),
            {
              loading: "Working",
              success: (value) => value,
              error: (error) => (error instanceof Error ? error.message : String(error)),
            },
          );
        }}>
        Show promise lifecycle
      </Button>
      <Toaster />
    </>
  ),
};
