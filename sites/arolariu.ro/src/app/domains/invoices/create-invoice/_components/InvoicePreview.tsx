/** @format */

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import Image from "next/image";
import {TbCarouselHorizontal, TbGridDots} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import {useInvoiceActions} from "../_hooks/useInvoiceActions";
import {CarouselView} from "./CarouselView";
import {GridView} from "./GridView";
import {MediaPreview} from "./MediaPreview";

const PLACEHOLDER_IMAGE = "https://dummyimage.com/600x900&text=placeholder";

/**
 * This function renders the invoice scans preview.
 * @returns The JSX for the invoice scans preview.
 */
export default function InvoicePreview() {
  const {scans} = useInvoiceCreator();
  const {handleRotateScan, handleDeleteScan} = useInvoiceActions();

  // Helper function to handle rotation by index (for compatibility with child components)
  const handleRotate = (index: number) => {
    if (index < 0 || index >= scans.length) return;
    const scan = scans[index];
    if (scan) {
      handleRotateScan(scan.id);
    }
  };

  // Helper function to handle deletion by index (for compatibility with child components)
  const handleDelete = (index: number) => {
    if (index < 0 || index >= scans.length) return;
    const scan = scans[index];
    if (scan) {
      handleDeleteScan(scan.id);
    }
  };

  // Case 1: No scans:
  if (scans.length === 0) {
    return (
      <Image
        className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center p-10 md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
        src={PLACEHOLDER_IMAGE}
        width='600'
        height='900'
        aria-hidden
        alt=''
      />
    );
  }

  // Case 2: One scan:
  if (scans.length === 1) {
    return (
      <div className='mx-auto flex w-1/3 flex-col flex-nowrap items-center justify-center justify-items-center'>
        <div className='relative aspect-square min-h-[550px] overflow-hidden rounded-lg border'>
          <MediaPreview
            scan={scans[0]!}
            index={0}
            onRotate={handleRotate}
            onDelete={handleDelete}
          />
        </div>
      </div>
    );
  }

  // Case 3: More than 1 scan:
  if (scans.length >= 2) {
    return (
      <Tabs
        defaultValue='grid'
        className='mx-auto w-1/2'>
        <TabsList className='mx-auto mb-4 grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='grid'>
            <TbGridDots className='mr-2' /> Grid
          </TabsTrigger>
          <TabsTrigger value='carousel'>
            <TbCarouselHorizontal className='mr-2' /> Carousel
          </TabsTrigger>
        </TabsList>

        <div className='min-h-[550px] w-full rounded-lg'>
          <TabsContent
            value='grid'
            className='h-full'>
            <GridView
              scans={scans}
              handleDelete={handleDelete}
              handleRotate={handleRotate}
            />
          </TabsContent>
          <TabsContent
            value='carousel'
            className='h-full'>
            <CarouselView
              scans={scans}
              handleDelete={handleDelete}
              handleRotate={handleRotate}
            />
          </TabsContent>
        </div>
      </Tabs>
    );
  }

  return false as unknown as React.JSX.Element;
}
