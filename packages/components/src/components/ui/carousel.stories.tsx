import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {cn} from "@/lib/utilities";

import {Button} from "./button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
  type CarouselProps,
} from "./carousel";
import styles from "./carousel.module.css";

const meta = {
  title: "Components/Data Display/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

function Slides({
  count = 5,
  multiple = false,
  pictures = false,
}: Readonly<{count?: number; multiple?: boolean; pictures?: boolean}>): React.ReactElement {
  return (
    <CarouselContent className={styles.storyTrack}>
      {Array.from({length: count}, (_, index) => (
        <CarouselItem
          key={index}
          className={multiple ? styles.storyMultipleItem : undefined}
          aria-label={`Slide ${index + 1} of ${count}`}>
          <div className={styles.storyPanel}>
            {pictures ? (
              <svg
                className={styles.storyPicture}
                role='img'
                aria-label={`Illustrated landscape ${index + 1}`}
                viewBox='0 0 320 180'>
                <circle
                  cx={60 + index * 35}
                  cy='45'
                  r='20'
                />
                <path d='M0 180 110 65 185 130 245 85 320 180Z' />
              </svg>
            ) : (
              <span className={styles.storyNumber}>{index + 1}</span>
            )}
            <Button
              variant='outline'
              size='sm'>
              Focus slide {index + 1}
            </Button>
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
  );
}

function Demo({
  count = 5,
  multiple = false,
  pictures = false,
  ...props
}: Readonly<CarouselProps & {count?: number; multiple?: boolean; pictures?: boolean}>): React.ReactElement {
  return (
    <div className={styles.storyFrame}>
      <Carousel
        aria-label='Featured slides'
        {...props}>
        <Slides
          count={count}
          multiple={multiple}
          pictures={pictures}
        />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

/** Focus a slide button and use Left/Right; omitted orientation is horizontal. */
export const Default: Story = {render: () => <Demo />};

/** Slide sizing belongs to a CSS Module rather than utility class strings. */
export const MultipleItems: Story = {
  render: () => (
    <Demo
      multiple
      opts={{align: "start"}}
    />
  ),
};

/** Self-contained illustrations avoid remote image requests in the example. */
export const WithImages: Story = {render: () => <Demo pictures />};

/** The vertical track has a definite height; use Up/Down to navigate. */
export const Vertical: Story = {
  render: () => (
    <Demo
      orientation='vertical'
      opts={{align: "start"}}
    />
  ),
};

/** Omitted orientation resolves from the actual Embla axis option. */
export const AxisFromOptions: Story = {render: () => <Demo opts={{axis: "y", align: "start"}} />};

/** Explicit horizontal orientation wins over a contradictory options axis. */
export const OrientationOverride: Story = {
  render: () => (
    <Demo
      orientation='horizontal'
      opts={{axis: "y"}}
    />
  ),
};

/** A looping engine keeps both navigation controls available at every snap. */
export const Looping: Story = {render: () => <Demo opts={{loop: true}} />};

/** A single slide keeps both controls disabled, not hidden. */
export const SingleSlide: Story = {render: () => <Demo count={1} />};

function SelectionControls(): React.ReactElement {
  const {api} = useCarousel();
  const subscribe = React.useCallback(
    (notify: () => void): (() => void) => {
      api?.on("select", notify);
      api?.on("reInit", notify);
      return () => {
        api?.off("select", notify);
        api?.off("reInit", notify);
      };
    },
    [api],
  );
  const getSnapshot = React.useCallback((): string => `${api?.selectedScrollSnap() ?? 0}:${api?.scrollSnapList().length ?? 0}`, [api]);
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, () => "0:0");
  const selectedIndex = Number(snapshot.split(":")[0]);
  const count = Number(snapshot.split(":")[1]);

  return (
    <div className={styles.storyIndicators}>
      <output
        aria-label='Slide position'
        aria-live='polite'>
        {count ? `Slide ${selectedIndex + 1} of ${count}` : "Initializing carousel"}
      </output>
      <div className={styles.storyIndicatorRow}>
        {Array.from({length: count}, (_, index) => (
          <Button
            key={index}
            variant='outline'
            size='icon-sm'
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === selectedIndex ? "true" : undefined}
            className={cn(styles.storyIndicator)}
            onClick={() => api?.scrollTo(index)}>
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Custom thumbnail controls scroll the real API and stay synchronized on select/reInit. */
export const WithThumbnails: Story = {
  render: () => (
    <div className={styles.storyFrame}>
      <Carousel aria-label='Slides with thumbnail controls'>
        <Slides pictures />
        <CarouselPrevious />
        <CarouselNext />
        <SelectionControls />
      </Carousel>
    </div>
  ),
};

function HookControls(): React.ReactElement {
  const {orientation, canScrollPrev, canScrollNext, scrollPrev, scrollNext} = useCarousel();
  return (
    <div className={styles.storyIndicators}>
      <p>Custom controls, resolved axis: {orientation}</p>
      <div className={styles.storyIndicatorRow}>
        <Button
          disabled={!canScrollPrev}
          onClick={scrollPrev}>
          Back
        </Button>
        <Button
          disabled={!canScrollNext}
          onClick={scrollNext}>
          Forward
        </Button>
      </div>
    </div>
  );
}

/** useCarousel supplies resolved orientation and safe, reactive navigation availability. */
export const CustomControls: Story = {
  render: () => (
    <div className={styles.storyFrame}>
      <Carousel aria-label='Custom carousel controls'>
        <Slides />
        <HookControls />
      </Carousel>
    </div>
  ),
};

function AutoPlayDemo(): React.ReactElement {
  const [api, setApi] = React.useState<CarouselApi>();
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!api || !playing) return;
    const interval = window.setInterval(() => api.scrollNext(), 3000);
    return () => window.clearInterval(interval);
  }, [api, playing]);

  return (
    <div className={styles.storyFrame}>
      <Carousel
        aria-label='Opt-in automatic carousel'
        opts={{loop: true}}
        setApi={setApi}
        onFocusCapture={() => setPlaying(false)}
        onMouseEnter={() => setPlaying(false)}>
        <Slides />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div className={styles.storyIndicators}>
        <Button
          aria-pressed={playing}
          onClick={() => setPlaying((value) => !value)}>
          {playing ? "Pause automatic advance" : "Start automatic advance"}
        </Button>
        <p>Advances every 3 seconds after opting in. Focusing or hovering a slide pauses it.</p>
      </div>
    </div>
  );
}

/** Automatic advancement is opt-in, pausable and cleaned up when the story unmounts. */
export const AutoPlay: Story = {render: () => <AutoPlayDemo />};

/** The shared Button primitive supplies the render callback's actual disabled state. */
export const ComposedControls: Story = {
  render: () => (
    <div className={styles.storyFrame}>
      <Carousel aria-label='Composed navigation controls'>
        <Slides />
        <CarouselPrevious
          render={(props, state) => (
            <button
              {...props}
              aria-label={state.disabled ? "Previous slide unavailable" : "Previous slide"}
            />
          )}
        />
        <CarouselNext
          asChild
          size='sm'>
          <button type='button'>Next</button>
        </CarouselNext>
      </Carousel>
    </div>
  ),
};

/** Native capture cancellation lets a consumer retain arrow-key behavior in a control. */
export const KeyboardCancellation: Story = {
  render: () => (
    <Demo
      onKeyDownCapture={(event) => {
        if (event.key.startsWith("Arrow")) event.preventDefault();
      }}
    />
  ),
};
