"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import useEmblaCarousel, {type UseEmblaCarouselType} from "embla-carousel-react";
import {ArrowLeft, ArrowRight} from "lucide-react";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utilities";

import styles from "./carousel.module.css";

/** Initialized API provided by the installed Embla carousel engine. */
export type CarouselApi = NonNullable<UseEmblaCarouselType[1]>;
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
/** Options accepted by the installed Embla React hook. */
export type CarouselOptions = UseCarouselParameters[0];
/** Plugin list accepted by the installed Embla React hook. */
export type CarouselPlugin = UseCarouselParameters[1];

/**
 * Carousel configuration props.
 */
type CarouselConfiguration = Readonly<{
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
   * for vertical). Explicit orientation overrides `opts.axis`; otherwise
   * `opts.axis: "y"` resolves to vertical, and all other cases to horizontal.
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Callback invoked with the initialized Embla API instance.
   * @default undefined
   */
  setApi?: (api: CarouselApi) => void;
}>;

/** Native div props and readonly carousel configuration. */
export type CarouselProps = Readonly<React.ComponentPropsWithoutRef<"div"> & CarouselConfiguration>;
/** Native props for the slide track; the forwarded ref targets the inner div. */
export type CarouselContentProps = Readonly<React.ComponentPropsWithoutRef<"div">>;
/** Native props for an orientation-aware slide div. */
export type CarouselItemProps = Readonly<React.ComponentPropsWithoutRef<"div">>;
/** Shared Button props for previous navigation, including primitive-owned render composition. */
export type CarouselPreviousProps = Readonly<React.ComponentPropsWithoutRef<typeof Button>>;
/** Shared Button props for next navigation, including primitive-owned render composition. */
export type CarouselNextProps = Readonly<React.ComponentPropsWithoutRef<typeof Button>>;

/** Readonly carousel context for custom descendants and navigation controls. */
export type CarouselContextProps = Readonly<
  {
    carouselRef: ReturnType<typeof useEmblaCarousel>[0];
    api: ReturnType<typeof useEmblaCarousel>[1];
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
    orientation: "horizontal" | "vertical";
    setApi: CarouselConfiguration["setApi"];
  } & Omit<CarouselConfiguration, "orientation" | "setApi">
>;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

/**
 * Reads the resolved orientation, Embla API, viewport ref and navigation state.
 *
 * @returns The nearest Carousel provider's readonly context; `api` is undefined
 * until its viewport initializes. Availability updates on select and reInit.
 * @throws {Error} When called outside a Carousel provider.
 */
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
 * - Explicit orientation overrides `opts.axis`; omitted orientation follows it
 * - Matching arrow keys are handled in capture; cancel in `onKeyDownCapture`
 *   with `preventDefault()` to retain a descendant's native key behavior
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
const Carousel = React.forwardRef<HTMLDivElement, Carousel.Props>(
  ({orientation, opts, setApi, plugins, className, children, ...props}: Readonly<Carousel.Props>, ref): React.ReactElement => {
    // Derive axis from orientation, or orientation from opts.axis, defaulting to horizontal.
    const resolvedOrientation = orientation ?? (opts?.axis === "y" ? "vertical" : "horizontal");
    const resolvedAxis = resolvedOrientation === "vertical" ? "y" : "x";

    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: resolvedAxis,
      },
      plugins,
    );
    const subscribe = React.useCallback(
      (onStoreChange: () => void): (() => void) => {
        api?.on("reInit", onStoreChange);
        api?.on("select", onStoreChange);

        return () => {
          api?.off("reInit", onStoreChange);
          api?.off("select", onStoreChange);
        };
      },
      [api],
    );

    // A primitive snapshot stays referentially stable until scroll availability changes.
    const getSnapshot = React.useCallback((): "both" | "previous" | "next" | "none" => {
      const canScrollPrev = api?.canScrollPrev() ?? false;
      const canScrollNext = api?.canScrollNext() ?? false;

      if (canScrollPrev && canScrollNext) {
        return "both";
      }

      if (canScrollPrev) {
        return "previous";
      }

      return canScrollNext ? "next" : "none";
    }, [api]);

    const scrollAvailability = React.useSyncExternalStore(subscribe, getSnapshot, () => "none");
    const canScrollPrev = scrollAvailability === "previous" || scrollAvailability === "both";
    const canScrollNext = scrollAvailability === "next" || scrollAvailability === "both";

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.defaultPrevented) return;
        const isPreviousKey = event.key === (resolvedOrientation === "horizontal" ? "ArrowLeft" : "ArrowUp");
        const isNextKey = event.key === (resolvedOrientation === "horizontal" ? "ArrowRight" : "ArrowDown");
        if (isPreviousKey) {
          event.preventDefault();
          scrollPrev();
        } else if (isNextKey) {
          event.preventDefault();
          scrollNext();
        }
      },
      [resolvedOrientation, scrollNext, scrollPrev],
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    const rootProps = mergeProps<"div">({onKeyDownCapture: handleKeyDown}, props);

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
          data-slot='carousel'
          data-orientation={resolvedOrientation}
          className={cn(styles.carousel, className)}
          role='region'
          aria-roledescription='carousel'
          {...rootProps}>
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
const CarouselContent = React.forwardRef<HTMLDivElement, CarouselContent.Props>(
  ({className, ...props}: Readonly<CarouselContent.Props>, ref): React.ReactElement => {
    const {carouselRef, orientation} = useCarousel();

    return (
      <div
        ref={carouselRef}
        data-slot='carousel-content'
        data-orientation={orientation}
        className={styles.viewport}>
        <div
          ref={ref}
          data-slot='carousel-track'
          data-orientation={orientation}
          className={cn(styles.content, orientation === "vertical" && styles.contentVertical, className)}
          {...props}
        />
      </div>
    );
  },
);
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
const CarouselItem = React.forwardRef<HTMLDivElement, CarouselItem.Props>(
  ({className, ...props}: Readonly<CarouselItem.Props>, ref): React.ReactElement => {
    const {orientation} = useCarousel();

    return (
      <div
        ref={ref}
        data-slot='carousel-item'
        role='group'
        aria-roledescription='slide'
        data-orientation={orientation}
        className={cn(styles.item, orientation === "vertical" && styles.itemVertical, className)}
        {...props}
      />
    );
  },
);
CarouselItem.displayName = "CarouselItem";

/**
 * Renders the previous-slide navigation button.
 *
 * @remarks
 * - Renders the shared `<Button>` component
 * - Built on carousel context state and Embla navigation APIs
 * - Pass `children` to override the default `ArrowLeft` navigation icon
 * - `render` and legacy `asChild` preserve the target's refs and child content
 * - Refs target `HTMLElement` because Button supports non-native render targets
 * - Consumer click cancellation prevents scrolling; unavailable ends stay disabled
 *
 * @example
 * ```tsx
 * <CarouselPrevious />
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselPrevious = React.forwardRef<HTMLElement, CarouselPrevious.Props>(
  (
    {
      children,
      asChild = false,
      className,
      variant = "outline",
      size = "icon-sm",
      disabled = false,
      onClick,
      ...props
    }: Readonly<CarouselPrevious.Props>,
    ref,
  ): React.ReactElement => {
    const {orientation, scrollPrev, canScrollPrev} = useCarousel();
    const clickProps = mergeProps<"button">(
      {
        onClick(event) {
          if (!event.defaultPrevented) scrollPrev();
        },
      },
      {onClick},
    );

    return (
      <Button
        {...props}
        {...clickProps}
        ref={ref}
        variant={variant}
        size={size}
        asChild={asChild}
        disabled={disabled || !canScrollPrev}
        data-slot='carousel-previous'
        data-orientation={orientation}
        className={cn(styles.navigationButton, styles.previousButton, className)}>
        {asChild ? (
          children
        ) : (
          <>
            {children ?? <ArrowLeft className={styles.navigationIcon} />}
            <span className={styles.srOnly}>Previous slide</span>
          </>
        )}
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
 * - `render` and legacy `asChild` preserve the target's refs and child content
 * - Refs target `HTMLElement` because Button supports non-native render targets
 * - Consumer click cancellation prevents scrolling; unavailable ends stay disabled
 *
 * @example
 * ```tsx
 * <CarouselNext />
 * ```
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
const CarouselNext = React.forwardRef<HTMLElement, CarouselNext.Props>(
  (
    {
      children,
      asChild = false,
      className,
      variant = "outline",
      size = "icon-sm",
      disabled = false,
      onClick,
      ...props
    }: Readonly<CarouselNext.Props>,
    ref,
  ): React.ReactElement => {
    const {orientation, scrollNext, canScrollNext} = useCarousel();
    const clickProps = mergeProps<"button">(
      {
        onClick(event) {
          if (!event.defaultPrevented) scrollNext();
        },
      },
      {onClick},
    );

    return (
      <Button
        {...props}
        {...clickProps}
        ref={ref}
        variant={variant}
        size={size}
        asChild={asChild}
        disabled={disabled || !canScrollNext}
        data-slot='carousel-next'
        data-orientation={orientation}
        className={cn(styles.navigationButton, styles.nextButton, className)}>
        {asChild ? (
          children
        ) : (
          <>
            {children ?? <ArrowRight className={styles.navigationIcon} />}
            <span className={styles.srOnly}>Next slide</span>
          </>
        )}
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace Carousel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Props = CarouselProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Api = CarouselApi;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Options = CarouselOptions;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Plugin = CarouselPlugin;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Context = CarouselContextProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace CarouselContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Props = CarouselContentProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace CarouselItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Props = CarouselItemProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace CarouselPrevious {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Props = CarouselPreviousProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace CarouselNext {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public canonical namespace alias
  export type Props = CarouselNextProps;
}

export {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, useCarousel};
