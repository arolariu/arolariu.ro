"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import useEmblaCarousel, {type UseEmblaCarouselType} from "embla-carousel-react";
import {ArrowLeft, ArrowRight} from "lucide-react";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utilities";

import styles from "./carousel.module.css";

type CarouselApi = NonNullable<UseEmblaCarouselType[1]>;
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

/**
 * Carousel configuration props.
 */
type CarouselProps = {
  /**
   * Embla carousel options forwarded to the underlying carousel instance.
   * @default undefined
   */
  opts?: CarouselOptions;
  /**
   * Embla plugins applied to the carousel instance.
   * @default undefined
   */
  plugins?: CarouselPlugin;
  /**
   * Axis orientation used for layout and keyboard navigation. This prop also
   * controls Embla's internal `axis` option (`"x"` for horizontal and `"y"`
   * for vertical).
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Callback invoked with the initialized Embla API instance.
   * @default undefined
   */
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel(): CarouselContextProps {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

/**
 * Provides a compound carousel container powered by Embla.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built on `embla-carousel-react`
 * - Exposes context for content, items, and navigation controls
 *
 * @example
 * ```tsx
 * <Carousel>
 *   <CarouselContent>
 *     <CarouselItem>Slide 1</CarouselItem>
 *     <CarouselItem>Slide 2</CarouselItem>
 *   </CarouselContent>
 *   <CarouselPrevious />
 *   <CarouselNext />
 * </Carousel>
 * ```
 *
 * @param props.opts - Embla options forwarded to the carousel instance. Common
 * options include `loop` for infinite scrolling, `align` for slide alignment,
 * `slidesToScroll` to control navigation increments, `dragFree` for momentum
 * dragging, `duration` for transition timing, and `startIndex` for the initial
 * slide.
 * @param props.plugins - Embla plugins applied to the carousel instance.
 *
 * @example With autoplay
 * ```tsx
 * import Autoplay from "embla-carousel-autoplay";
 *
 * <Carousel plugins={[Autoplay({delay: 3000})]}>
 *   <CarouselContent>...</CarouselContent>
 * </Carousel>
 * ```
 *
 * @param props.setApi - Optional callback for advanced Embla API access after
 * initialization, useful for custom controls, analytics, or external state
 * synchronization.
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const Carousel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CarouselProps>(
  ({orientation = "horizontal", opts, setApi, plugins, className, children, ...props}, ref) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins,
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((emblaApi: CarouselApi) => {
      if (!emblaApi) {
        return;
      }

      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    }, []);

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (orientation === "horizontal") {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollPrev();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollNext();
          }

          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          scrollNext();
        }
      },
      [orientation, scrollNext, scrollPrev],
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);

      return () => {
        api.off("reInit", onSelect);
        api.off("select", onSelect);
      };
    }, [api, onSelect]);

    const resolvedOrientation = orientation || (opts?.axis === "y" ? "vertical" : "horizontal");

    return (
      <CarouselContext.Provider
        value={{
          api,
          canScrollNext,
          canScrollPrev,
          carouselRef,
          opts,
          orientation: resolvedOrientation,
          plugins,
          scrollNext,
          scrollPrev,
          setApi,
        }}>
        <div
          ref={ref}
          data-orientation={resolvedOrientation}
          onKeyDownCapture={handleKeyDown}
          className={cn(styles.carousel, className)}
          role='region'
          aria-roledescription='carousel'
          {...props}>
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

/**
 * Renders the scrollable track that contains carousel slides.
 *
 * @remarks
 * - Renders nested `<div>` elements
 * - Built on Embla's viewport and track structure
 *
 * @example
 * ```tsx
 * <CarouselContent>
 *   <CarouselItem>Slide</CarouselItem>
 * </CarouselContent>
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => {
  const {carouselRef, orientation} = useCarousel();

  return (
    <div
      ref={carouselRef}
      className={styles.viewport}>
      <div
        ref={ref}
        data-orientation={orientation}
        className={cn(styles.content, orientation === "vertical" && styles.contentVertical, className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

/**
 * Renders an individual carousel slide.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built on the shared carousel context for orientation-aware styling
 *
 * @example
 * ```tsx
 * <CarouselItem>Slide content</CarouselItem>
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => {
  const {orientation} = useCarousel();

  return (
    <div
      ref={ref}
      role='group'
      aria-roledescription='slide'
      data-orientation={orientation}
      className={cn(styles.item, orientation === "vertical" && styles.itemVertical, className)}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

/**
 * Renders the previous-slide navigation button.
 *
 * @remarks
 * - Renders the shared `<Button>` component
 * - Built on carousel context state and Embla navigation APIs
 * - Pass `children` to override the default `ArrowLeft` navigation icon
 *
 * @example
 * ```tsx
 * <CarouselPrevious />
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({children, className, variant = "outline", size = "icon", ...props}, ref) => {
    const {orientation, scrollPrev, canScrollPrev} = useCarousel();
    const mergedProps = mergeProps<"button">({onClick: scrollPrev, disabled: !canScrollPrev}, props);

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        data-orientation={orientation}
        className={cn(styles.navigationButton, styles.previousButton, className)}
        {...mergedProps}>
        {children ?? <ArrowLeft className={styles.navigationIcon} />}
        <span className={styles.srOnly}>Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

/**
 * Renders the next-slide navigation button.
 *
 * @remarks
 * - Renders the shared `<Button>` component
 * - Built on carousel context state and Embla navigation APIs
 * - Pass `children` to override the default `ArrowRight` navigation icon
 *
 * @example
 * ```tsx
 * <CarouselNext />
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({children, className, variant = "outline", size = "icon", ...props}, ref) => {
    const {orientation, scrollNext, canScrollNext} = useCarousel();
    const mergedProps = mergeProps<"button">({onClick: scrollNext, disabled: !canScrollNext}, props);

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        data-orientation={orientation}
        className={cn(styles.navigationButton, styles.nextButton, className)}
        {...mergedProps}>
        {children ?? <ArrowRight className={styles.navigationIcon} />}
        <span className={styles.srOnly}>Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi};
