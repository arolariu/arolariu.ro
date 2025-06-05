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
import type { CarouselApi } from "../dist"; // Import the type

const meta: Meta<typeof Carousel> = {
  title: "Design System/Carousel",
  component: Carousel,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Carousel Component**

A slideshow component for cycling through a series of content items (slides). Built upon the \`embla-carousel-react\` library, providing a flexible and performant foundation, styled according to shadcn/ui.

**Core Components:**
*   \`<Carousel>\`: The main wrapper component. Initializes the Embla Carousel instance and provides context. Accepts \`opts\` (Embla options), \`orientation\`, \`plugins\`, and \`setApi\` props.
*   \`<CarouselContent>\`: The container (\`<div>\`) for the carousel slides. Uses Flexbox for layout.
*   \`<CarouselItem>\`: Represents a single slide (\`<div>\`) within the carousel. Often used with utility classes (e.g., Tailwind's \`basis-*\`) to control how many items are visible per slide.
*   \`<CarouselPrevious>\`: A button (\`<Button>\`) component pre-configured to navigate to the previous slide. Uses the Carousel API context.
*   \`<CarouselNext>\`: A button (\`<Button>\`) component pre-configured to navigate to the next slide. Uses the Carousel API context.

**Key Features & Props:**
*   **Embla Integration**: Leverages \`embla-carousel-react\` for core functionality, including smooth scrolling, drag-to-scroll (on touch devices), and various configuration options.
*   **Options (\`opts\` prop):** Pass Embla Carousel options directly (e.g., \`{ loop: true, align: 'start', dragFree: false }\`). See Embla documentation for all options.
*   **Orientation**: Supports \`'horizontal'\` (default) and \`'vertical'\` orientations via the \`orientation\` prop.
*   **API Access (\`setApi\` prop):** Provides a callback to get access to the underlying Embla Carousel API instance for programmatic control (e.g., scrolling to specific slides, getting current index).
*   **Plugins**: Supports Embla Carousel plugins (e.g., Autoplay, ClassNames) via the \`plugins\` prop.
*   **Styling**: Uses Tailwind CSS for styling navigation buttons and layout. Slide sizing is typically controlled via utility classes on \`<CarouselItem>\`.

See the [shadcn/ui Carousel documentation](https://ui.shadcn.com/docs/components/carousel) and the [Embla Carousel documentation](https://www.embla-carousel.com/api/) for comprehensive details.
        `,
      },
    },
  },
  argTypes: {
    orientation: {
      options: ["horizontal", "vertical"],
      control: { type: "radio" },
      description: "The orientation of the carousel.",
      table: {
        defaultValue: { summary: "horizontal" },
      },
    },
    opts: {
      control: "object",
      description:
        "Options passed directly to the underlying Embla Carousel instance (e.g., `{ loop: true, align: 'start' }`).",
    },
    setApi: {
      action: "apiSet",
      description:
        "Callback to get the underlying Embla Carousel API instance.",
    },
    // Other props like className are available
  },
};

export default meta;

type Story = StoryObj<typeof Carousel>;

// Basic carousel
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A simple horizontal carousel with basic navigation buttons.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates showing multiple items per slide using CSS classes (like Tailwind's `basis-*`) on \`<CarouselItem>\`. Uses `opts={{ align: 'start', loop: true }}`.",
      },
    },
  },
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
  args: {
    orientation: "vertical",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A carousel oriented vertically by setting `orientation='vertical'`.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-xs mx-auto">
      <Carousel {...args} className="h-[300px] w-full max-w-xs">
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
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to get access to the Embla Carousel API using the `setApi` prop to control the carousel programmatically and display information like the current slide number.",
      },
    },
  },
  render: function APICarousel() {
    const [api, setApi] = React.useState<CarouselApi | null>(null); // Use imported type
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
  parameters: {
    docs: {
      description: {
        story:
          "A common use case: displaying images within a carousel. Uses `opts={{ loop: true }}`.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates customizing the appearance and positioning of the navigation buttons (\`<CarouselPrevious>\` and \`<CarouselNext>\`) using props and CSS classes.",
      },
    },
  },
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
