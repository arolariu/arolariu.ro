import {Separator, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useState} from "react";
import {TbGrid3X3, TbList, TbTable} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import CarouselDisplay from "../_views/CarouselDisplay";
import GridDisplay from "../_views/GridDisplay";
import TableDisplay from "../_views/TableDisplay";

/**
 * Upload preview component for invoice scans.
 * Supports three display modes: grid, carousel, and table.
 * @returns JSX.Element that displays the upload preview for invoice scans.
 */
export default function UploadPreview(): React.JSX.Element | null {
  const {submissions} = useInvoiceCreator();
  const [view, setView] = useState("table");

  if (submissions.length === 0) return null;

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
            value='table'
            className='cursor-pointer data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white'>
            <TbTable className='mr-2 h-4 w-4' />
            <span className='hidden sm:inline'>Table</span>
          </TabsTrigger>
          <Separator orientation='vertical' />
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

        <div className='relative w-full'>
          <TabsContent
            value='grid'
            forceMount
            className={
              view === "grid" ? "relative opacity-100 transition-opacity" : "pointer-events-none absolute inset-0 -z-10 opacity-0"
            }>
            <GridDisplay />
          </TabsContent>
          <TabsContent
            value='carousel'
            forceMount
            className={
              view === "carousel" ? "relative opacity-100 transition-opacity" : "pointer-events-none absolute inset-0 -z-10 opacity-0"
            }>
            <CarouselDisplay />
          </TabsContent>
          <TabsContent
            value='table'
            forceMount
            className={
              view === "table" ? "relative opacity-100 transition-opacity" : "pointer-events-none absolute inset-0 -z-10 opacity-0"
            }>
            <TableDisplay />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
