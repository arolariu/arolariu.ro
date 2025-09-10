import {Separator, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useLayoutEffect, useRef, useState} from "react";
import {TbGrid3X3, TbList} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import CarouselDisplay from "../_views/CarouselDisplay";
import GridDisplay from "../_views/GridDisplay";

/**
 * Upload preview component for invoice scans.
 * @returns JSX.Element that displays the upload preview for invoice scans.
 */
export default function UploadPreview(): React.JSX.Element | null {
  const {scans} = useInvoiceCreator();
  const [view, setView] = useState("grid");
  const gridRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  // Measure once scans change so we can reserve vertical space & avoid layout shift.
  useLayoutEffect(() => {
    if (scans.length === 0) {
      return;
    }

    // Allow next paint so children render.
    requestAnimationFrame(() => {
      const gh = gridRef.current?.offsetHeight || 0;
      const ch = carouselRef.current?.offsetHeight || 0;
      const next = Math.max(gh, ch);
      if (next && next !== maxHeight) {
        setMaxHeight(next);
      }
    });
  }, [scans, view, maxHeight]);

  if (scans.length === 0) {
    return null;
  }

  return (
    <motion.div
      className='mb-6 flex justify-center sm:mb-8'
      initial={{opacity: 0, scale: 0.9}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.3}}>
      <Tabs
        value={view}
        onValueChange={setView}
        defaultValue='grid'>
        <TabsList className='mx-auto gap-4 bg-white/80 shadow-lg backdrop-blur-sm'>
          <TabsTrigger
            value='grid'
            className='cursor-pointer data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white'>
            <TbGrid3X3 className='mr-2 h-4 w-4' />
            <span className='hidden sm:inline'>Grid</span>
          </TabsTrigger>
          <Separator orientation='vertical' />
          <TabsTrigger
            value='carousel'
            className='cursor-pointer data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white'>
            <TbList className='mr-2 h-4 w-4' />
            <span className='hidden sm:inline'>Carousel</span>
          </TabsTrigger>
        </TabsList>

        <div
          className='relative w-full transition-[min-height] duration-200'
          style={maxHeight ? {minHeight: maxHeight} : undefined}>
          <TabsContent
            value='grid'
            forceMount
            className={
              view === "grid" ? "relative opacity-100 transition-opacity" : "pointer-events-none absolute inset-0 -z-10 opacity-0"
            }>
            <div ref={gridRef}>
              <GridDisplay />
            </div>
          </TabsContent>
          <TabsContent
            value='carousel'
            forceMount
            className={
              view === "carousel" ? "relative opacity-100 transition-opacity" : "pointer-events-none absolute inset-0 -z-10 opacity-0"
            }>
            <div ref={carouselRef}>
              <CarouselDisplay />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
