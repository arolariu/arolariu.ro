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

  it("disables previous button when canScrollPrev is false", () => {
    // Arrange
    vi.mocked(emblaMock.api.canScrollPrev).mockReturnValue(false);
    renderCarousel();

    // Assert
    const previousButton = screen.getByRole("button", {name: "Previous slide"});
    expect(previousButton).toBeDisabled();
  });

  it("disables next button when canScrollNext is false", () => {
    // Arrange
    vi.mocked(emblaMock.api.canScrollNext).mockReturnValue(false);
    renderCarousel();

    // Assert
    const nextButton = screen.getByRole("button", {name: "Next slide"});
    expect(nextButton).toBeDisabled();
  });

  it("supports vertical orientation with correct data attribute", () => {
    // Arrange
    renderCarousel({orientation: "vertical"});

    // Assert
    const carousel = screen.getByRole("region");
    expect(carousel).toHaveAttribute("data-orientation", "vertical");
  });

  it("passes vertical axis to Embla when orientation is vertical", () => {
    // Arrange
    renderCarousel({orientation: "vertical"});

    // Assert
    expect(emblaMock.useEmblaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: "y",
      }),
      undefined,
    );
  });

  it("passes horizontal axis to Embla when orientation is horizontal", () => {
    // Arrange
    renderCarousel({orientation: "horizontal"});

    // Assert
    expect(emblaMock.useEmblaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: "x",
      }),
      undefined,
    );
  });

  it("defaults to horizontal axis when no orientation is specified", () => {
    // Arrange
    renderCarousel();

    // Assert
    expect(emblaMock.useEmblaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: "x",
      }),
      undefined,
    );
  });

  it("supports horizontal keyboard navigation with ArrowLeft", () => {
    // Arrange
    renderCarousel({orientation: "horizontal"});

    // Act
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowLeft"});

    // Assert
    expect(emblaMock.api.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("supports horizontal keyboard navigation with ArrowRight", () => {
    // Arrange
    renderCarousel({orientation: "horizontal"});

    // Act
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowRight"});

    // Assert
    expect(emblaMock.api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("ignores vertical arrow keys when orientation is horizontal", () => {
    // Arrange
    renderCarousel({orientation: "horizontal"});

    // Act
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowUp"});
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowDown"});

    // Assert
    expect(emblaMock.api.scrollPrev).not.toHaveBeenCalled();
    expect(emblaMock.api.scrollNext).not.toHaveBeenCalled();
  });

  it("ignores horizontal arrow keys when orientation is vertical", () => {
    // Arrange
    renderCarousel({orientation: "vertical"});

    // Act
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowLeft"});
    fireEvent.keyDown(screen.getByRole("region"), {key: "ArrowRight"});

    // Assert
    expect(emblaMock.api.scrollPrev).not.toHaveBeenCalled();
    expect(emblaMock.api.scrollNext).not.toHaveBeenCalled();
  });

  it("registers Embla event listeners on mount", () => {
    // Arrange
    renderCarousel();

    // Assert
    expect(emblaMock.api.on).toHaveBeenCalledWith("reInit", expect.any(Function));
    expect(emblaMock.api.on).toHaveBeenCalledWith("select", expect.any(Function));
  });

  it("calls setApi only when api is available", () => {
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

  it("passes opts to Embla carousel", () => {
    // Arrange
    render(
      <Carousel opts={{loop: true, align: "start"}}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    expect(emblaMock.useEmblaCarousel).toHaveBeenCalledWith(
      expect.objectContaining({
        align: "start",
        axis: "x",
        loop: true,
      }),
      undefined,
    );
  });

  it("passes plugins to Embla carousel", () => {
    // Arrange
    const mockPlugin = vi.fn();
    render(
      <Carousel plugins={[mockPlugin]}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    expect(emblaMock.useEmblaCarousel).toHaveBeenCalledWith(expect.any(Object), [mockPlugin]);
  });

  it("renders CarouselContent with vertical orientation data attribute", () => {
    // Arrange
    render(
      <Carousel orientation='vertical'>
        <CarouselContent data-testid='carousel-content'>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    const content = screen.getByTestId("carousel-content");
    expect(content).toHaveAttribute("data-orientation", "vertical");
  });

  it("renders CarouselItem with vertical orientation data attribute", () => {
    // Arrange
    render(
      <Carousel orientation='vertical'>
        <CarouselContent>
          <CarouselItem data-testid='carousel-item'>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    const item = screen.getByTestId("carousel-item");
    expect(item).toHaveAttribute("data-orientation", "vertical");
  });

  it("renders CarouselPrevious with vertical orientation data attribute", () => {
    // Arrange
    render(
      <Carousel orientation='vertical'>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid='prev-button' />
      </Carousel>,
    );

    // Assert
    const button = screen.getByTestId("prev-button");
    expect(button).toHaveAttribute("data-orientation", "vertical");
  });

  it("renders CarouselNext with vertical orientation data attribute", () => {
    // Arrange
    render(
      <Carousel orientation='vertical'>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselNext data-testid='next-button' />
      </Carousel>,
    );

    // Assert
    const button = screen.getByTestId("next-button");
    expect(button).toHaveAttribute("data-orientation", "vertical");
  });

  it("applies custom variant to CarouselPrevious", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious
          variant='ghost'
          data-testid='prev-ghost'
        />
      </Carousel>,
    );

    // Assert - The button should be rendered with the ghost variant
    expect(screen.getByTestId("prev-ghost")).toBeInTheDocument();
  });

  it("applies custom size to CarouselNext", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselNext
          size='lg'
          data-testid='next-lg'
        />
      </Carousel>,
    );

    // Assert - The button should be rendered with the lg size
    expect(screen.getByTestId("next-lg")).toBeInTheDocument();
  });

  it("merges custom className on CarouselContent", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent
          className='custom-content'
          data-testid='content'>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    expect(screen.getByTestId("content")).toHaveClass("custom-content");
  });

  it("merges custom className on CarouselItem", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem
            className='custom-item'
            data-testid='item'>
            Slide 1
          </CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    // Assert
    expect(screen.getByTestId("item")).toHaveClass("custom-item");
  });

  it("merges custom className on CarouselPrevious", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious className='custom-prev' />
      </Carousel>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Previous slide"})).toHaveClass("custom-prev");
  });

  it("merges custom className on CarouselNext", () => {
    // Arrange
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselNext className='custom-next' />
      </Carousel>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Next slide"})).toHaveClass("custom-next");
  });
});
