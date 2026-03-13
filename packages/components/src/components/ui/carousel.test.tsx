import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

interface MockEmblaApi {
  canScrollNext: () => boolean;
  canScrollPrev: () => boolean;
  off: (event: "reInit" | "select", callback: (api: MockEmblaApi) => void) => void;
  on: (event: "reInit" | "select", callback: (api: MockEmblaApi) => void) => void;
  scrollNext: () => void;
  scrollPrev: () => void;
}

const emblaMock = vi.hoisted(() => {
  const api: MockEmblaApi = {
    canScrollNext: vi.fn(() => true),
    canScrollPrev: vi.fn(() => true),
    off: vi.fn(),
    on: vi.fn(),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
  };

  return {
    api,
    useEmblaCarousel: vi.fn(() => [vi.fn(), api] as const),
  };
});

vi.mock("embla-carousel-react", () => ({
  default: emblaMock.useEmblaCarousel,
}));

import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "./carousel";

describe("Carousel", () => {
  beforeEach(() => {
    vi.mocked(emblaMock.api.canScrollNext).mockReturnValue(true);
    vi.mocked(emblaMock.api.canScrollPrev).mockReturnValue(true);
    vi.mocked(emblaMock.api.on).mockClear();
    vi.mocked(emblaMock.api.off).mockClear();
    vi.mocked(emblaMock.api.scrollNext).mockClear();
    vi.mocked(emblaMock.api.scrollPrev).mockClear();
    vi.mocked(emblaMock.useEmblaCarousel).mockClear();
  });

  function renderCarousel({
    className,
    nextButtonOnClick,
    orientation,
    previousButtonOnClick,
  }: Readonly<{
    className?: string;
    nextButtonOnClick?: () => void;
    orientation?: "horizontal" | "vertical";
    previousButtonOnClick?: () => void;
  }> = {}): ReturnType<typeof render> {
    return render(
      <Carousel
        className={className}
        orientation={orientation}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious onClick={previousButtonOnClick} />
        <CarouselNext onClick={nextButtonOnClick} />
      </Carousel>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderCarousel();

    // Assert
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("calls the carousel navigation methods when buttons are clicked", () => {
    // Arrange
    renderCarousel();

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Previous slide"}));
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));

    // Assert
    expect(emblaMock.api.scrollPrev).toHaveBeenCalledTimes(1);
    expect(emblaMock.api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("merges the root className", () => {
    // Arrange
    renderCarousel({className: "custom-carousel"});

    // Assert
    expect(screen.getByRole("region")).toHaveClass("custom-carousel");
  });

  it("renders slide children", () => {
    // Arrange
    renderCarousel();

    // Assert
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
    expect(screen.getByText("Slide 2")).toBeInTheDocument();
  });

  it("merges consumer onClick handlers with carousel navigation", () => {
    // Arrange
    const previousButtonOnClick = vi.fn();
    const nextButtonOnClick = vi.fn();

    renderCarousel({nextButtonOnClick, previousButtonOnClick});

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Previous slide"}));
    fireEvent.click(screen.getByRole("button", {name: "Next slide"}));

    // Assert
    expect(previousButtonOnClick).toHaveBeenCalledTimes(1);
    expect(nextButtonOnClick).toHaveBeenCalledTimes(1);
    expect(emblaMock.api.scrollPrev).toHaveBeenCalledTimes(1);
    expect(emblaMock.api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("renders custom navigation children instead of the default arrow icons", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious>
          <span data-testid='previous-icon'>Previous custom icon</span>
        </CarouselPrevious>
        <CarouselNext>
          <span data-testid='next-icon'>Next custom icon</span>
        </CarouselNext>
      </Carousel>,
    );

    // Assert
    expect(screen.getByTestId("previous-icon")).toBeInTheDocument();
    expect(screen.getByTestId("next-icon")).toBeInTheDocument();
  });

  it("supports vertical keyboard navigation", () => {
    // Arrange
    renderCarousel({orientation: "vertical"});

    // Act
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowUp"});
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowDown"});

    // Assert
    expect(emblaMock.api.scrollPrev).toHaveBeenCalledTimes(1);
    expect(emblaMock.api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("passes the initialized embla api to setApi", () => {
    // Arrange
    const setApi = vi.fn();

    render(
      <Carousel setApi={setApi}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    expect(setApi).toHaveBeenCalledWith(emblaMock.api);
  });

  it("cleans up all Embla event listeners on unmount", () => {
    // Arrange
    const {unmount} = renderCarousel();

    // Act
    unmount();

    // Assert
    expect(emblaMock.api.off).toHaveBeenCalledWith("reInit", expect.any(Function));
    expect(emblaMock.api.off).toHaveBeenCalledWith("select", expect.any(Function));
  });
});
