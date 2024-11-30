/** @format */

import Image from "next/image";
import {Tab, TabList, TabPanel, Tabs} from "react-aria-components";
import {BiGridAlt} from "react-icons/bi";

type Props = {images: Blob[]};

/**
 * This function renders the invoice images preview.
 * @param images The images to preview.
 * @returns The JSX for the invoice images preview.
 */
export default function InvoicePreview({images}: Readonly<Props>) {
  if (images.length > 0) {
    return (
      <Tabs className='mx-auto mb-2 w-1/2 rounded-xl border-2'>
        <TabList>
          <Tab id='grid'>
            <div className='grid grid-cols-4 grid-rows-4'>TODO: COMING SOON...</div>
          </Tab>
        </TabList>
        <TabPanel className='mx-auto flex w-1/2 items-center justify-center justify-items-center gap-4 border-2 border-b-0 bg-white dark:bg-black 2xsm:flex-col sm:flex-row'>
          <BiGridAlt className='mx-2' />
          Grid View
        </TabPanel>
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
