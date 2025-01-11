/** @format */

import Image from "next/image";
import Link from "next/link";
import {type Dispatch, type SetStateAction, useCallback} from "react";
import {Tab, TabList, TabPanel, Tabs} from "react-aria-components";
import {BiGridAlt, BiListOl} from "react-icons/bi";

type Props = {images: Blob[]; setImages: Dispatch<SetStateAction<Blob[]>>};

const ImageActions = ({image, setImages}: Readonly<{image: Blob; setImages: Dispatch<SetStateAction<Blob[]>>}>) => {
  /**
   * This function deletes an image from the state.
   */
  const handleDeleteImage = useCallback(() => {
    setImages((images) => images.filter((imageInState) => imageInState !== image));
  }, [image, setImages]);

  /**
   * This function rotates an image 90 degrees clockwise, from the state.
   */
  const handleRotateImage = () => {
    const URL = window.URL || window.webkitURL;
    const imageURL = URL.createObjectURL(image);
    const imageElement = document.createElement("img");
    imageElement.src = imageURL;
    imageElement.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = imageElement.height;
        canvas.height = imageElement.width;
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((90 * Math.PI) / 180);
        context.drawImage(imageElement, -imageElement.width / 2, -imageElement.height / 2);
        const rotatedImage = canvas.toDataURL("image/jpeg");
        fetch(rotatedImage)
          .then((response) => response.blob())
          .then((blob) => {
            setImages((images) => images.map((imageInState) => (imageInState === image ? blob : imageInState)));
          });
      }
    };
  };

  return (
    <div className='flex flex-row items-center justify-center justify-items-center gap-4'>
      <button
        className='btn btn-secondary'
        onClick={handleDeleteImage}>
        Delete
      </button>
      <button
        className='btn btn-secondary'
        onClick={handleRotateImage}>
        Rotate
      </button>
    </div>
  );
};

/**
 * This function renders the invoice images preview.
 * @param images The images to preview.
 * @returns The JSX for the invoice images preview.
 */
export default function InvoicePreview({images, setImages}: Readonly<Props>) {
  if (images.length > 0) {
    return (
      <Tabs className='mx-auto mb-2 w-1/2 rounded-xl border-2'>
        <p className='bg-gray-200 p-2 dark:bg-gray-800'>Display style:</p>
        <TabList className='flex flex-row items-center justify-center justify-items-center gap-16 bg-gray-200 p-2 dark:bg-gray-800'>
          <Tab
            id='grid'
            className='cursor-pointer'>
            <BiGridAlt className='mx-auto' />
            <small>Grid View</small>
          </Tab>
          <Tab
            id='list'
            className='cursor-pointer'>
            <BiListOl className='mx-auto' />
            <small>List View</small>
          </Tab>
        </TabList>
        <TabPanel
          id='grid'
          className='mx-auto flex w-1/2 items-center justify-center justify-items-center gap-4 bg-white dark:bg-black 2xsm:flex-col sm:flex-row'>
          {images.map((image, index) => {
            const URL = window.URL || window.webkitURL;
            const imageURL = URL.createObjectURL(image);
            return (
              <div key={imageURL}>
                <Link
                  href={imageURL}
                  target='_blank'>
                  <Image
                    className='m-2 rounded border-2 object-fill object-center'
                    alt={`Invoice image ${index}`}
                    src={imageURL}
                    width='1000'
                    height='1000'
                  />
                  Receipt #{index + 1}
                </Link>
                <ImageActions
                  image={image}
                  setImages={setImages}
                />
              </div>
            );
          })}
        </TabPanel>
        <TabPanel id='list'>
          {images.map((image, index) => {
            const URL = window.URL || window.webkitURL;
            const imageURL = URL.createObjectURL(image);
            return (
              <div key={imageURL}>
                <Link
                  key={imageURL}
                  href={imageURL}
                  target='_blank'>
                  <div>
                    Hello #{index}, {imageURL}
                  </div>
                </Link>
                <ImageActions
                  image={image}
                  setImages={setImages}
                />
              </div>
            );
          })}
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
