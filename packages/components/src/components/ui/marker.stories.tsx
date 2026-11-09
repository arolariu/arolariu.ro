import {AlertCircle, Calendar, Check} from "lucide-react";
import type * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {Marker, MarkerContent, MarkerIcon, markerVariants} from "./marker";
const storyStyles = `
.ac-story-marker-storyStack {
  display: flex;
  inline-size: min(32rem, 90vw);
  flex-direction: column;
  gap: var(--ac-space-4);
}
`;

const storyClasses = {
  storyStack: "ac-story-marker-storyStack",
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
  title: "Components/Data Display/Marker",
  component: Marker,
  tags: ["autodocs"],
  argTypes: {variant: {control: "select", options: ["default", "separator", "border"]}},
} satisfies Meta<typeof Marker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {variant: "default"},
  render: (args): React.JSX.Element => (
    <Marker {...args}>
      <MarkerIcon>
        <Calendar />
      </MarkerIcon>
      <MarkerContent>Today · caller-provided boundary</MarkerContent>
    </Marker>
  ),
};

export const CompoundSurfaces: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Marker>
        <MarkerIcon>
          <Check />
        </MarkerIcon>
        <MarkerContent>Caller reports completion</MarkerContent>
      </Marker>
      <Marker variant='separator'>
        <MarkerIcon>
          <Calendar />
        </MarkerIcon>
        <MarkerContent>Yesterday</MarkerContent>
      </Marker>
      <Marker variant='border'>
        <MarkerContent>
          Earlier messages · <a href='#marker-history'>open history</a>
        </MarkerContent>
      </Marker>
    </div>
  ),
};

export const NativeCompositionAndHelper: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Marker
        variant='border'
        render={<a href='#marker-history' />}>
        <MarkerContent>Caller navigation boundary</MarkerContent>
      </Marker>
      <Marker
        variant='separator'
        render={(props, state): React.ReactElement => (
          <button
            {...props}
            type='button'
            data-example-variant={state.variant}
          />
        )}>
        <MarkerContent>Caller-composed native control</MarkerContent>
      </Marker>
      <div className={markerVariants({variant: "separator"})}>
        <MarkerContent>CSS helper without a Marker root</MarkerContent>
      </div>
    </div>
  ),
};

export const EmptyErrorLongContentAndRTL: Story = {
  render: (): React.JSX.Element => (
    <div
      className={storyClasses.storyStack}
      dir='rtl'>
      <Marker
        variant='separator'
        aria-hidden='true'>
        <MarkerContent />
      </Marker>
      <Marker>
        <MarkerIcon>
          <AlertCircle />
        </MarkerIcon>
        <MarkerContent>The caller supplies an error and its recovery instructions.</MarkerContent>
      </Marker>
      <Marker variant='separator'>
        <MarkerContent>حد فاصل يملكه المستدعي</MarkerContent>
      </Marker>
      <Marker variant='border'>
        <MarkerContent>{"LongUnbrokenCallerBoundary".repeat(16)}</MarkerContent>
      </Marker>
    </div>
  ),
};
