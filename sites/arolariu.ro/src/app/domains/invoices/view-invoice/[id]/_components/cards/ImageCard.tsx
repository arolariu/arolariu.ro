/** @format */

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {TbArrowUp, TbUpload} from "react-icons/tb";

type Props = {photoLocation: string};

export function ImageCard({photoLocation = "https://dummyimage.com/600x900&text=placeholder"}: Readonly<Props>) {
  // TODO: remove in prod:
  photoLocation = "https://dummyimage.com/600x900&text=placeholder";

  return (
    <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Receipt Image</CardTitle>
      </CardHeader>
      <CardContent className='flex justify-center'>
        <motion.img
          transition={{type: "spring", stiffness: 300, damping: 10}}
          className='w-full rounded-md border object-cover'
          src={photoLocation}
          whileHover={{scale: 1.05}}
          alt=''
          aria-hidden
        />
      </CardContent>
      <CardFooter className='flex flex-col justify-end gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='group w-full'
                onClick={() => {}}>
                <span>Expand Image</span>
                <TbArrowUp className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View the full image of the receipt</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='link'
                className='group w-full'
                onClick={() => {}}>
                <TbUpload className='mr-2 h-4 w-4' />
                <span>Reupload Image</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Modify the original image</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

