import {
  Button,
  Card,
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useState, useSyncExternalStore} from "react";
import MediaPreview from "../_components/MediaPreview";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Custom hook to get the current and total count of carousel items.
 * @param api The carousel API instance.
 * @returns An object containing the current slide index and total slide count.
 */
function useCarouselSnapshot(api: CarouselApi | null) {
  return useSyncExternalStore(
    (onChange) => {
      if (!api) {
        return () => {};
      }

      const notify = () => onChange();
      api.on("select", notify);
      api.on("reInit", notify);
      return () => {
        api.off("select", notify);
        api.off("reInit", notify);
      };
    },
    () => {
      if (!api) {
        return {current: 1, count: 0};
      }

      const count = api.scrollSnapList().length;
      const current = api.selectedScrollSnap() + 1;
      return {current, count};
    },
  );
}

/**
 * Carousel display component for invoice scans.
 * @returns JSX.Element that displays a carousel of invoice scans.
 */
export default function CarouselDisplay(): React.JSX.Element | null {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const {current, count} = useCarouselSnapshot(api);
  const {scans} = useInvoiceCreator();

  if (scans.length === 0) {
    return null;
  }

  return (
    <div className='relative'>
      <Carousel
        setApi={setApi}
        opts={{align: "center", loop: scans.length > 1}}>
        <CarouselContent>
          {scans.map((scan, index) => (
            <CarouselItem
              key={scan.id}
              className='basis-full px-4'>
              <motion.div
                initial={{opacity: 0, scale: 0.95}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.3, delay: index * 0.05}}>
                <Card className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
                  <MediaPreview file={scan} />
                </Card>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {scans.length > 1 && (
          <>
            <div className='absolute top-1/2 left-2 z-10 -translate-y-1/2 sm:left-4'>
              <CarouselPrevious className='h-12 w-12 cursor-pointer border-2 bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-purple-300 hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-900' />
            </div>
            <div className='absolute top-1/2 right-2 z-10 -translate-y-1/2 sm:right-4'>
              <CarouselNext className='h-12 w-12 cursor-pointer border-2 bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-purple-300 hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-900' />
            </div>
          </>
        )}
      </Carousel>

      {scans.length > 1 && (
        <>
          {/* Dots */}
          <motion.div
            className='mt-6 flex justify-center gap-3'
            initial={{opacity: 0, y: 12}}
            animate={{opacity: 1, y: 0}}>
            {Array.from({length: count}).map((_, i) => {
              const active = i + 1 === current;
              return (
                <Button
                  key={`dot-${i + 1}`}
                  type='button'
                  className={`cursor-pointer rounded-full transition-all duration-300 ${
                    active
                      ? "h-3 w-8 bg-gradient-to-r from-purple-600 to-pink-600"
                      : "h-3 w-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
                  }`}
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              );
            })}
          </motion.div>

          {/* Index */}
          <motion.div
            className='mt-4 text-center'
            initial={{opacity: 0}}
            animate={{opacity: 1}}>
            <span className='rounded-full bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-lg backdrop-blur-sm dark:bg-gray-900/80 dark:text-gray-300'>
              {current} of {count} files
            </span>
          </motion.div>
        </>
      )}
    </div>
  );
}

