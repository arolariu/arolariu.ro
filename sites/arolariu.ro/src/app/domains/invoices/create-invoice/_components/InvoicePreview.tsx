/** @format */

// We disable react/jsx-no-bind because it would result in code duplication
// and unnecessary complexity. The use of inline functions is justified in this case
/* eslint react/jsx-no-bind: 0 */

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@arolariu/components";
import Image from "next/image";
import {memo, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction} from "react";
import {TbCarouselHorizontal, TbGridDots, TbRotateClockwise, TbTrash} from "react-icons/tb";
import {useBlobUrls} from "../_hooks/useBlobUrls";

type Props = {images: Blob[]; setImages: Dispatch<SetStateAction<Blob[]>>};
const PLACEHOLDER_IMAGE = "https://dummyimage.com/600x900&text=placeholder";
const IMAGES_PER_PAGE = 4;

const isPDF = (blob: Blob): boolean => {
  return blob.type === "application/pdf";
};

const MediaPreview = memo(function MediaPreview({
  blob,
  index,
  onRotate,
  onDelete,
}: Readonly<{
  blob: Blob;
  index: number;
  onRotate?: (index: number) => void;
  onDelete: (index: number) => void;
}>) {
  const {getUrl} = useBlobUrls();
  const isPdfFile = isPDF(blob);
  const [url, setUrl] = useState<string>(getUrl(blob));
  const [loadError, setLoadError] = useState<boolean>(false);

  // Create URL on mount and cleanup on unmount
  useEffect(() => {
    // Reset state when blob changes
    setLoadError(false);

    // Get URL from the hook or create directly
    const blobUrl = getUrl(blob);
    setUrl(blobUrl);

    // Cleanup function
    return () => {
      // URL cleanup should be handled by the useBlobUrls hook
    };
  }, [blob, getUrl]);

  if (isPdfFile) {
    return (
      <div className='relative flex h-full w-full flex-col overflow-hidden'>
        <div className='absolute left-0 top-0 z-10 rounded-br-lg bg-primary px-2 py-1 text-xs text-white'>PDF</div>
        {url ? (
          <iframe
            src={`${url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
            className='h-full w-full rounded-lg'
            style={{border: "none", overflow: "hidden"}}
            title={`PDF Document ${index + 1}`}
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-gray-50'>
            <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          </div>
        )}
        <div className='absolute bottom-2 right-2'>
          <Button
            size='icon'
            variant='destructive'
            onClick={(_event) => onDelete(index)}>
            <TbTrash
              className='h-4 w-4'
              aria-hidden='true'
            />
            <span className='sr-only'>Delete PDF</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='relative aspect-square h-full w-full overflow-hidden'>
      {!url || loadError ? (
        <div className='flex h-full w-full items-center justify-center bg-gray-50'>
          {loadError ? (
            <div className='text-muted-foreground text-center'>
              <div>Failed to load image</div>
            </div>
          ) : (
            <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          )}
        </div>
      ) : (
        <Image
          className='h-full w-full rounded-lg object-cover transition-all'
          src={url}
          width={300}
          height={300}
          unoptimized
          priority={index < 4}
          onError={() => setLoadError(true)}
          alt={`Invoice image ${index + 1}`}
        />
      )}
      <div className='absolute bottom-2 right-2 flex gap-2'>
        {onRotate && (
          <Button
            size='icon'
            variant='secondary'
            onClick={(_event) => onRotate(index)}>
            <TbRotateClockwise
              className='h-4 w-4'
              aria-hidden='true'
            />
            <span className='sr-only'>Rotate image</span>
          </Button>
        )}
        <Button
          size='icon'
          variant='destructive'
          onClick={(_event) => onDelete(index)}>
          <TbTrash
            className='h-4 w-4'
            aria-hidden='true'
          />
          <span className='sr-only'>Delete image</span>
        </Button>
      </div>
    </div>
  );
});

/**
 * Component to render a grid view of images with pagination.
 * @returns The JSX for the grid view.
 */
function GridView({
  images,
  handleDelete,
  handleRotate,
}: Readonly<
  Props & {
    handleDelete: (index: number) => void;
    handleRotate: (index: number) => void;
  }
>) {
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Memoize pagination information for better performance
  const paginationInfo = useMemo(
    () => ({
      startIndex: currentPage * IMAGES_PER_PAGE,
      currentImages: images.slice(
        currentPage * IMAGES_PER_PAGE,
        Math.min((currentPage + 1) * IMAGES_PER_PAGE, images.length),
      ),
      totalPages: Math.ceil(images.length / IMAGES_PER_PAGE),
    }),
    [currentPage, images],
  );

  // Ensure current page is valid when images change
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(images.length / IMAGES_PER_PAGE) - 1);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [images.length, currentPage]);

  // Navigation handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(Math.ceil(images.length / IMAGES_PER_PAGE) - 1, prev + 1));
  }, [images.length]);

  // Memoized image renderer to prevent unnecessary re-renders
  const renderGridItems = useCallback(() => {
    return paginationInfo.currentImages.map((image, idx) => {
      const actualIndex = paginationInfo.startIndex + idx;

      return (
        <div
          key={`image-${actualIndex}`}
          className='relative aspect-square overflow-hidden rounded-lg border'>
          <MediaPreview
            blob={image}
            index={actualIndex}
            onRotate={handleRotate}
            onDelete={handleDelete}
          />
        </div>
      );
    });
  }, [handleDelete, handleRotate, paginationInfo]);

  return (
    <div className='flex flex-col space-y-4'>
      {/* Grid layout */}
      <div className='grid min-h-[400px] grid-cols-2 gap-2 p-4'>
        {/* Render current page images */}
        {renderGridItems()}
      </div>

      {/* Pagination controls */}
      {paginationInfo.totalPages > 1 && (
        <Pagination className='mx-auto'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href='#'
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevPage();
                }}
                aria-disabled={currentPage === 0}
                className={currentPage === 0 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            <PaginationItem className='flex items-center px-2'>
              Page {currentPage + 1} of {paginationInfo.totalPages}
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href='#'
                onClick={(e) => {
                  e.preventDefault();
                  handleNextPage();
                }}
                aria-disabled={currentPage >= paginationInfo.totalPages - 1}
                className={currentPage >= paginationInfo.totalPages - 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

/**
 * Component to render a carousel view of images.
 * @returns The JSX for the carousel view.
 */
function CarouselView({
  images,
  handleDelete,
  handleRotate,
}: Readonly<
  Props & {
    handleDelete: (index: number) => void;
    handleRotate: (index: number) => void;
  }
>) {
  // Track current slide for keyboard navigation
  const [api, setApi] = useState<CarouselApi>();

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!api) return;
      if (e.key === "ArrowLeft") api.scrollPrev();
      if (e.key === "ArrowRight") api.scrollNext();
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [api]);

  return (
    <div className='flex flex-col items-center justify-center justify-items-center'>
      <Carousel setApi={setApi}>
        <CarouselContent className='h-full'>
          {images.map((image, index) => {
            const isPdfFile = isPDF(image);

            return (
              <CarouselItem
                key={`carousel-image-${index}`}
                className='min-h-[1150px]'>
                <Card className='flex h-full flex-col overflow-hidden'>
                  <CardContent className='relative flex flex-1 items-center bg-gray-50 p-0'>
                    <MediaPreview
                      blob={image}
                      index={index}
                      onRotate={handleRotate}
                      onDelete={handleDelete}
                    />
                  </CardContent>
                  <CardFooter className='flex justify-between p-3'>
                    <div className='text-muted-foreground text-sm'>
                      {isPdfFile ? "PDF" : "Image"} {index + 1} of {images.length}
                    </div>
                  </CardFooter>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <div className='pointer-events-none absolute inset-0 flex items-center justify-between px-2'>
          <CarouselPrevious className='pointer-events-auto' />
          <CarouselNext className='pointer-events-auto' />
        </div>
      </Carousel>
    </div>
  );
}

/**
 * This function renders the invoice images preview.
 * @param images The images to preview.
 * @returns The JSX for the invoice images preview.
 */
export default function InvoicePreview({images, setImages}: Readonly<Props>) {
  // Track deleted images with more information for proper restoration
  const deletedImageRef = useRef<{blob: Blob; index: number; type: string} | null>(null);

  const handleRotate = useCallback(
    (index: number) => {
      if (index < 0 || index >= images.length) return;
      const imageToRotate = images[index];

      if (isPDF(imageToRotate!)) {
        toast("PDF files cannot be rotated.", {
          duration: 4000,
        });
        return;
      }

      // Create an Image object to draw onto canvas
      const img = new globalThis.Image();
      const imageUrl = URL.createObjectURL(imageToRotate!);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Could not get canvas context");
          }

          // Swap width and height for 90-degree rotation
          canvas.width = img.height;
          canvas.height = img.width;

          // Apply rotation transformation
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(Math.PI / 2); // 90 degrees clockwise
          ctx.drawImage(img, -img.width / 2, -img.height / 2);

          // Convert canvas back to a blob with the same type as the original
          canvas.toBlob(
            (rotatedBlob) => {
              if (rotatedBlob) {
                setImages((prevImages) => {
                  const newImages = [...prevImages];
                  newImages[index] = rotatedBlob;
                  return newImages;
                });
              }

              // Clean up the temporary object URL
              URL.revokeObjectURL(imageUrl);
            },
            imageToRotate!.type,
            1.0, // Maintain full quality
          );
        } catch (error) {
          console.error("Error rotating image:", error);
          URL.revokeObjectURL(imageUrl);
        }
      };

      img.onerror = () => {
        console.error("Failed to load image for rotation");
        URL.revokeObjectURL(imageUrl);
      };

      // Start loading the image
      img.src = imageUrl;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setImages is stable.
    [images],
  );

  const handleDelete = useCallback(
    (index: number) => {
      if (index < 0 || index >= images.length) return;

      const deletedBlob = images[index];

      // Store image for potential undo
      deletedImageRef.current = {
        // Create a deep copy of the blob to preserve its data
        blob: new Blob([deletedBlob!], {type: deletedBlob!.type}),
        index: index,
        type: deletedBlob!.type,
      };

      // Remove image from array
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));

      toast("Image deleted!", {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: () => {
            if (deletedImageRef.current) {
              const {blob, index, type} = deletedImageRef.current;

              // Create a brand new blob to force URL regeneration
              const restoredBlob = new Blob([blob], {type});

              setImages((prevImages) => {
                const newImages = [...prevImages];
                // Insert at the original position or at the end if the position is now beyond the array
                const insertPosition = Math.min(index, newImages.length);
                newImages.splice(insertPosition, 0, restoredBlob);
                return newImages;
              });

              // Clear the reference
              deletedImageRef.current = null;
            }
          },
        },
      });
    },
    [images],
  );

  // Case 1: No images:
  if (images.length === 0) {
    return (
      <img
        className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center p-10 md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
        src={PLACEHOLDER_IMAGE}
        width='600'
        height='900'
        aria-hidden
        alt=''
      />
    );
  }

  // Case 2: One image:
  if (images.length === 1) {
    return (
      <div className='mx-auto flex w-1/3 flex-col flex-nowrap items-center justify-center justify-items-center'>
        <div className='relative aspect-square min-h-[550px] overflow-hidden rounded-lg border'>
          <MediaPreview
            blob={images[0]!}
            index={0}
            onRotate={handleRotate}
            onDelete={handleDelete}
          />
        </div>
      </div>
    );
  }

  // Case 3: More than 1 image:
  if (images.length >= 2) {
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
              images={images}
              setImages={setImages}
              handleDelete={handleDelete}
              handleRotate={handleRotate}
            />
          </TabsContent>
          <TabsContent
            value='carousel'
            className='h-full'>
            <CarouselView
              images={images}
              setImages={setImages}
              handleDelete={handleDelete}
              handleRotate={handleRotate}
            />
          </TabsContent>
        </div>
      </Tabs>
    );
  }
}
