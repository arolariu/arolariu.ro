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
