/** @format */

import {Card, CardContent, Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from "@arolariu/components";
import type {InvoiceScan} from "../_types/InvoiceScan";
import {MediaPreview} from "./MediaPreview";

type Props = {
  scans: InvoiceScan[];
  handleDelete: (index: number) => void;
  handleRotate: (index: number) => void;
};

/**
 * Component to render a carousel view of scans.
 * @returns The JSX for the carousel view.
 */
export function CarouselView({scans, handleDelete, handleRotate}: Readonly<Props>) {
  return (
    <Carousel className='flex w-full flex-col items-center justify-center justify-items-center'>
      <CarouselContent>
        {scans.map((scan, index) => (
          <CarouselItem key={`carousel-item-${scan.id}`}>
            <Card>
              <CardContent className='relative flex aspect-square items-center justify-center p-6'>
                <MediaPreview
                  scan={scan}
                  index={index}
                  onDelete={handleDelete}
                  onRotate={handleRotate}
                />
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
