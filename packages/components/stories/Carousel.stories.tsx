import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../dist";

const meta: Meta<typeof Carousel> = {
  title: "Design System/Carousel",
  component: Carousel,
};

export default meta;

type Story = StoryObj<typeof Carousel>;

// Basic carousel
export const Basic: Story = {
  render: () => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

// Multiple items per view
export const MultipleItems: Story = {
  render: () => (
    <div className="w-full max-w-sm mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className="-ml-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="pl-1 md:basis-1/2 lg:basis-1/3"
            >
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-2xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

// Vertical carousel
export const Vertical: Story = {
  render: () => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel orientation="vertical" className="h-[300px] w-full max-w-xs">
        <CarouselContent className="-mt-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index} className="pt-1">
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-video items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};

// API example
export const APIExample: Story = {
  render: function APICarousel() {
    const [api, setApi] = React.useState<any>(null);
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
      if (!api) return;

      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);

      const onSelect = () => {
        setCurrent(api.selectedScrollSnap() + 1);
      };

      api.on("select", onSelect);
      return () => {
        api.off("select", onSelect);
      };
    }, [api]);

    return (
      <div className="w-full max-w-xs mx-auto">
        <Carousel setApi={setApi}>
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem key={index}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <div className="py-2 text-center text-sm text-muted-foreground">
          Slide {current} of {count}
        </div>
      </div>
    );
  },
};

// Image carousel
export const ImageCarousel: Story = {
  render: () => (
    <div className="w-full max-w-lg mx-auto">
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {[
            "/mountains-1.jpg",
            "/mountains-2.jpg",
            "/mountains-3.jpg",
            "/mountains-4.jpg",
          ].map((src, index) => (
            <CarouselItem key={index}>
              <Card className="border-0 overflow-hidden">
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <img
                    src={`https://source.unsplash.com/random/800x450?mountains&${index}`}
                    alt={`Mountain landscape ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  ),
};

// Custom navigation buttons
export const CustomNavigation: Story = {
  render: () => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="left-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50"
        />
        <CarouselNext
          variant="ghost"
          className="right-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50"
        />
      </Carousel>
    </div>
  ),
};
