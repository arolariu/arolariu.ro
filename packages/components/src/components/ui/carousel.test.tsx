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

  function renderCarousel(className?: string): void {
    render(
      <Carousel className={className}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
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
    renderCarousel("custom-carousel");

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
});
