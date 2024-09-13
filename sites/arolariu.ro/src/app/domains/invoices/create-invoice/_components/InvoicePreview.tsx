/** @format */

import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "@/components/ui/carousel";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import Image from "next/image";
import {BiCarousel, BiGridAlt} from "react-icons/bi";

type Props = {images: Blob[]};

/**
 * This function renders the invoice images preview.
 * @param images The images to preview.
 * @returns The JSX for the invoice images preview.
 */
export default function InvoicePreview({images}: Readonly<Props>) {
  if (images.length > 0) {
    return (
      <Tabs
        defaultValue='carousel'
        className='mx-auto mb-2 w-1/2 rounded-xl border-2'>
        <TabsContent value='carousel'>
          <Carousel className='mx-auto mb-10 h-2/3 w-5/6'>
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem
                  key={index}
                  className='flex h-screen w-full flex-col items-center justify-center justify-items-center gap-2'>
                  <p className='py-4 text-xl'>
                    Invoice #{index + 1}/{images.length}
                  </p>
                  <div className='h-screen w-full'>
                    {image.type === "application/pdf" ? (
                      <iframe
                        className='mx-auto h-full w-full'
                        src={URL.createObjectURL(image)}
                        title={`Invoice ${index + 1}`}
                      />
                    ) : (
                      <Image
                        className='mx-auto rounded-xl object-fill object-center'
                        alt={`Invoice ${index + 1}`}
                        src={URL.createObjectURL(image)}
                        width='600'
                        height='900'
                      />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </TabsContent>
        <TabsContent value='grid'>
          <div className='grid grid-cols-4 grid-rows-4'>TODO: COMING SOON...</div>
        </TabsContent>
        <TabsList className='mx-auto flex w-1/2 items-center justify-center justify-items-center gap-4 border-2 border-b-0 bg-white dark:bg-black 2xsm:flex-col sm:flex-row'>
          <TabsTrigger value='carousel'>
            <BiCarousel className='mx-2' />
            Carousel View
          </TabsTrigger>
          <TabsTrigger value='grid'>
            <BiGridAlt className='mx-2' />
            Grid View
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <Image
      className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center p-10 md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
      alt='Default dummy image'
      src='https://dummyimage.com/600x900&text=placeholder'
      width='600'
      height='900'
    />
  );
}
