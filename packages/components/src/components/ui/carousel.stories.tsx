import React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Card, CardContent} from "./card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "./carousel";

const meta = {
  title: "Components/Data Display/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default carousel with navigation buttons.
 */
export const Default: Story = {
  render: () => (
    <div className='w-full max-w-xs'>
      <Carousel className='w-full'>
        <CarouselContent>
          {Array.from({length: 5}, (_, index) => (
            <CarouselItem key={`slide-${index + 1}`}>
              <div className='p-1'>
                <Card>
                  <CardContent className='flex aspect-square items-center justify-center p-6'>
                    <span className='text-4xl font-semibold'>{index + 1}</span>
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

/**
 * Carousel with multiple items visible at once.
 */
export const MultipleItems: Story = {
  render: () => (
    <div className='w-full max-w-sm'>
      <Carousel
        opts={{
          align: "start",
        }}
        className='w-full'>
        <CarouselContent>
          {Array.from({length: 10}, (_, index) => (
            <CarouselItem
              key={`item-${index + 1}`}
              className='md:basis-1/2 lg:basis-1/3'>
              <div className='p-1'>
                <Card>
                  <CardContent className='flex aspect-square items-center justify-center p-6'>
                    <span className='text-3xl font-semibold'>{index + 1}</span>
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

/**
 * Carousel with image slides.
 */
export const WithImages: Story = {
  render: () => (
    <div className='w-full max-w-md'>
      <Carousel className='w-full'>
        <CarouselContent>
          {[
            {src: "https://picsum.photos/600/400?random=1", alt: "Slide 1"},
            {src: "https://picsum.photos/600/400?random=2", alt: "Slide 2"},
            {src: "https://picsum.photos/600/400?random=3", alt: "Slide 3"},
            {src: "https://picsum.photos/600/400?random=4", alt: "Slide 4"},
          ].map((image, index) => (
            <CarouselItem key={`image-${index + 1}`}>
              <div className='p-1'>
                <Card>
                  <CardContent className='p-0'>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className='h-[300px] w-full rounded-lg object-cover'
                    />
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

/**
 * Vertical carousel orientation.
 */
export const Vertical: Story = {
  render: () => (
    <div className='max-w-xs'>
      <Carousel
        opts={{
          align: "start",
        }}
        orientation='vertical'
        className='w-full max-w-xs'>
        <CarouselContent className='h-[400px]'>
          {Array.from({length: 5}, (_, index) => (
            <CarouselItem
              key={`vertical-${index + 1}`}
              className='pt-1 md:basis-1/2'>
              <div className='p-1'>
                <Card>
                  <CardContent className='flex items-center justify-center p-6'>
                    <span className='text-3xl font-semibold'>{index + 1}</span>
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

/**
 * Carousel that auto-advances every 3 seconds.
 */
function AutoPlayDemo() {
  const [api, setApi] = React.useState<{scrollNext: () => void; scrollTo: (index: number) => void} | null>(null);

  React.useEffect(() => {
    if (!api) return;

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [api]);

  return (
    <div style={{width: "100%", maxWidth: "448px"}}>
      <Carousel
        setApi={setApi as never}
        style={{width: "100%"}}>
        <CarouselContent>
          {[
            {color: "#ef4444", label: "Slide 1"},
            {color: "#3b82f6", label: "Slide 2"},
            {color: "#10b981", label: "Slide 3"},
            {color: "#f59e0b", label: "Slide 4"},
          ].map((slide, index) => (
            <CarouselItem key={`auto-${index + 1}`}>
              <div style={{padding: "4px"}}>
                <Card>
                  <CardContent
                    style={{
                      display: "flex",
                      aspectRatio: "1",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px",
                      background: slide.color,
                      color: "#fff",
                      borderRadius: "8px",
                    }}>
                    <div style={{textAlign: "center"}}>
                      <div style={{fontSize: "32px", fontWeight: 600, marginBottom: "8px"}}>{slide.label}</div>
                      <div style={{fontSize: "14px", opacity: 0.9}}>Auto-advances every 3s</div>
                    </div>
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
  );
}

export const AutoPlay: Story = {
  render: () => <AutoPlayDemo />,
};

/**
 * Carousel with thumbnail indicators below the main carousel.
 */
function WithThumbnailsDemo() {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const images = [
    {src: "https://picsum.photos/600/400?random=10", alt: "Image 1"},
    {src: "https://picsum.photos/600/400?random=11", alt: "Image 2"},
    {src: "https://picsum.photos/600/400?random=12", alt: "Image 3"},
    {src: "https://picsum.photos/600/400?random=13", alt: "Image 4"},
  ];

  return (
    <div style={{width: "100%", maxWidth: "512px"}}>
      <Carousel style={{width: "100%"}}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={`main-${index + 1}`}>
              <div style={{padding: "4px"}}>
                <Card>
                  <CardContent style={{padding: 0}}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      style={{height: "320px", width: "100%", borderRadius: "8px", objectFit: "cover"}}
                    />
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div style={{display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center"}}>
        {images.map((image, index) => (
          <button
            key={`thumb-${index + 1}`}
            onClick={() => setSelectedIndex(index)}
            style={{
              padding: 0,
              border: selectedIndex === index ? "2px solid #3b82f6" : "2px solid transparent",
              borderRadius: "6px",
              cursor: "pointer",
              background: "none",
              transition: "border 0.2s",
            }}>
            <img
              src={image.src}
              alt={image.alt}
              style={{width: "80px", height: "60px", borderRadius: "4px", objectFit: "cover", display: "block"}}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export const WithThumbnails: Story = {
  render: () => <WithThumbnailsDemo />,
};

/**
 * Carousel with only one slide showing no navigation is needed.
 */
export const SingleSlide: Story = {
  render: () => (
    <div style={{width: "100%", maxWidth: "384px"}}>
      <Carousel style={{width: "100%"}}>
        <CarouselContent>
          <CarouselItem>
            <div style={{padding: "4px"}}>
              <Card>
                <CardContent
                  style={{
                    display: "flex",
                    aspectRatio: "16/9",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    borderRadius: "8px",
                  }}>
                  <div style={{textAlign: "center"}}>
                    <div style={{fontSize: "28px", fontWeight: 600, marginBottom: "8px"}}>Single Slide</div>
                    <div style={{fontSize: "14px", opacity: 0.9}}>Navigation arrows are hidden when there's only one slide</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    </div>
  ),
};
