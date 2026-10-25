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
   * Embla carousel options forwarded to the underlying carousel instance. The
   * carousel sets `axis` from the resolved orientation and adds `duration: 0` to
   * the `(prefers-reduced-motion: reduce)` entry of `breakpoints`, keeping a
   * caller entry's other options and outranking the `duration` of every other
   * breakpoint. Transitions are instant while that preference matches, and the
   * caller's (or Embla's default) `duration` returns when it clears.
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

/**
 * The carousel root is a `region` landmark, so every instance needs its own
 * localized name; the package supplies none.
 */
type CarouselNamingProps =
  | {
      /** Localized name of the carousel region, such as "Featured products". */
      readonly "aria-label": string;
    }
  | {
      /** ID of the visible heading or text that names the carousel region. */
      readonly "aria-labelledby": string;
    };

/**
 * Native div props, readonly carousel configuration and a required region name:
 * a string `aria-label` or `aria-labelledby`. Because the props are a union,
 * extend them with an intersection type alias (`type X = CarouselProps & {…}`)
 * rather than an `interface`.
 */
export type CarouselProps = Readonly<React.ComponentPropsWithRef<"div"> & CarouselConfiguration & CarouselNamingProps>;
/** Native props for the slide track; the forwarded ref targets the inner div. */
export type CarouselContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native props for an orientation-aware slide div. */
export type CarouselItemProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Shared Button props for previous navigation, including primitive-owned render composition. */
export type CarouselPreviousProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof Button>, "size"> & {
    /** Visual preset; the carousel always supplies its navigation name. */
    size?: React.ComponentProps<typeof Button>["size"];
    /** Localizable fallback navigation name. @default "Previous slide" */
    label?: string;
  }
>;
/** Shared Button props for next navigation, including primitive-owned render composition. */
export type CarouselNextProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof Button>, "size"> & {
    /** Visual preset; the carousel always supplies its navigation name. */
    size?: React.ComponentProps<typeof Button>["size"];
    /** Localizable fallback navigation name. @default "Next slide" */
    label?: string;
  }
>;

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

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/**
 * Embla merges re-initialization options into its accumulated base, so a `duration: 0` merged while motion is reduced
 * would outlive the preference. Breakpoint options are instead resolved from that untouched base on every media change,
 * restoring the caller's (or Embla's default) duration. The entry goes last so it wins over caller breakpoints.
 */
function resolveEmblaOptions(opts: CarouselOptions, axis: "x" | "y"): NonNullable<CarouselOptions> {
  const {[reducedMotionQuery]: callerReducedMotion, ...callerBreakpoints} = opts?.breakpoints ?? {};
  return {...opts, axis, breakpoints: {...callerBreakpoints, [reducedMotionQuery]: {...callerReducedMotion, duration: 0}}};
}

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
 * - Renders a `<div role="region" aria-roledescription="carousel">`; each
 *   {@link CarouselItem} is a `group` with `aria-roledescription="slide"`. Pass
 *   the native `aria-roledescription` attribute to localize either description.
 * - Requires a distinct, localized region name through `aria-labelledby`
 *   (preferred when a visible heading exists) or `aria-label`. The props type
 *   enforces one of them and no default name is supplied, so carousels never
 *   share a generic landmark name.
 * - Built on `embla-carousel-react`
 * - Exposes context for content, items, and navigation controls
 * - Explicit orientation overrides `opts.axis`; omitted orientation follows it
 * - Under `prefers-reduced-motion: reduce`, slide transitions are instant; the
 *   caller's (or Embla's default) `duration` returns when the preference clears.
 * - Matching arrow keys bubble; editable/nested widget keys and canceled events
 *   retain their native behavior. Always provide pointer navigation controls.
 *
 * @example Named by a visible heading
 * ```tsx
 * <>
 *   <h2 id='featured-heading'>Featured products</h2>
 *   <Carousel aria-labelledby='featured-heading'>
 *     <CarouselContent>
 *       <CarouselItem>Slide 1</CarouselItem>
 *       <CarouselItem>Slide 2</CarouselItem>
 *     </CarouselContent>
 *     <CarouselPrevious />
 *     <CarouselNext />
 *   </Carousel>
 * </>
 * ```
 *
 * @example Named with a localized label
 * ```tsx
 * <Carousel
 *   aria-label='Produits en vedette'
 *   aria-roledescription='carrousel'
 *   opts={{loop: true}}>
 *   <CarouselContent>
 *     <CarouselItem aria-roledescription='diapositive'>Diapositive 1</CarouselItem>
 *     <CarouselItem aria-roledescription='diapositive'>Diapositive 2</CarouselItem>
 *   </CarouselContent>
 *   <CarouselPrevious label='Diapositive précédente' />
 *   <CarouselNext label='Diapositive suivante' />
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
 * Automatic plugins must expose a keyboard-operable pause/stop control and
 * stop on focus/hover; visibility/reduced-motion alone is not WCAG 2.2.2 compliance.
 *
 * @param props.setApi - Optional callback for advanced Embla API access after
 * initialization, useful for custom controls, analytics, or external state
 * synchronization.
 *
 * @see {@link https://www.embla-carousel.com/get-started/react/ | Embla React Docs}
 */
function Carousel({ref, orientation, opts, setApi, plugins, className, children, ...props}: Readonly<Carousel.Props>): React.ReactElement {
  // Derive axis from orientation, or orientation from opts.axis, defaulting to horizontal.
  const resolvedOrientation = orientation ?? (opts?.axis === "y" ? "vertical" : "horizontal");
  const resolvedAxis = resolvedOrientation === "vertical" ? "y" : "x";

  const [carouselRef, api] = useEmblaCarousel(resolveEmblaOptions(opts, resolvedAxis), plugins);
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
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const {target} = event;
      if (
        target instanceof Element
        && (target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="tablist"], [role="tree"], [role="menu"], [role="grid"], [role="treegrid"], [role="textbox"], [role="radiogroup"]',
        )
          || target.closest('[data-slot="carousel"]') !== event.currentTarget)
      )
        return;
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

  const rootProps = mergeProps<"div">({onKeyDown: handleKeyDown}, props);

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
}
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
function CarouselContent({ref, className, ...props}: Readonly<CarouselContent.Props>): React.ReactElement {
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
}
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
function CarouselItem({ref, className, ...props}: Readonly<CarouselItem.Props>): React.ReactElement {
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
}
CarouselItem.displayName = "CarouselItem";

/**
 * Renders the previous-slide navigation button.
 *
 * @remarks
 * - Renders the shared `<Button>` component
 * - Built on carousel context state and Embla navigation APIs
 * - Pass `children` to override the default `ArrowLeft` navigation icon
 * - `render` preserves the target's refs and child content
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
function CarouselPrevious({
  ref,
  children,
  label = "Previous slide",
  className,
  variant = "outline",
  size = "icon-sm",
  disabled = false,
  onClick,
  ...props
}: Readonly<CarouselPrevious.Props>): React.ReactElement {
  const {orientation, scrollPrev, canScrollPrev} = useCarousel();
  const renderContent = React.isValidElement<{children?: React.ReactNode; "aria-label"?: string}>(props.render)
    ? props.render.props
    : undefined;
  const content = children ?? renderContent?.children;
  const accessibleLabel = props["aria-label"] ?? renderContent?.["aria-label"] ?? (typeof content === "string" ? content : label);
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
      ref={ref}
      variant={variant}
      size={size}
      aria-label={accessibleLabel}
      disabled={disabled || !canScrollPrev}
      data-slot='carousel-previous'
      data-orientation={orientation}
      className={cn(styles.navigationButton, styles.previousButton, className)}
      {...clickProps}
      {...props}>
      {children ?? (React.isValidElement<{children?: React.ReactNode}>(props.render) ? props.render.props.children : undefined) ?? (
        <>
          {children ?? <ArrowLeft className={styles.navigationIcon} />}
          <span className={styles.srOnly}>{label}</span>
        </>
      )}
    </Button>
  );
}
CarouselPrevious.displayName = "CarouselPrevious";

/**
 * Renders the next-slide navigation button.
 *
 * @remarks
 * - Renders the shared `<Button>` component
 * - Built on carousel context state and Embla navigation APIs
 * - Pass `children` to override the default `ArrowRight` navigation icon
 * - `render` preserves the target's refs and child content
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
function CarouselNext({
  ref,
  children,
  label = "Next slide",
  className,
  variant = "outline",
  size = "icon-sm",
  disabled = false,
  onClick,
  ...props
}: Readonly<CarouselNext.Props>): React.ReactElement {
  const {orientation, scrollNext, canScrollNext} = useCarousel();
  const renderContent = React.isValidElement<{children?: React.ReactNode; "aria-label"?: string}>(props.render)
    ? props.render.props
    : undefined;
  const content = children ?? renderContent?.children;
  const accessibleLabel = props["aria-label"] ?? renderContent?.["aria-label"] ?? (typeof content === "string" ? content : label);
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
      ref={ref}
      variant={variant}
      size={size}
      aria-label={accessibleLabel}
      disabled={disabled || !canScrollNext}
      data-slot='carousel-next'
      data-orientation={orientation}
      className={cn(styles.navigationButton, styles.nextButton, className)}
      {...clickProps}
      {...props}>
      {children ?? (React.isValidElement<{children?: React.ReactNode}>(props.render) ? props.render.props.children : undefined) ?? (
        <>
          {children ?? <ArrowRight className={styles.navigationIcon} />}
          <span className={styles.srOnly}>{label}</span>
        </>
      )}
    </Button>
  );
}
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
