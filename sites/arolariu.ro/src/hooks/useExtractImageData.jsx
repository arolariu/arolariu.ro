/** @format */

import {useEffect, useState} from "react";

// TODO: this hook needs a major rework
export default function useExtractImageData(image) {
  // TODO: this hook should have clear documentation for what it advertises as it's offerings.
  const [imageData, setImageData] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [additionalMetadata, setAdditionalMetadata] = useState(null);

  const extractBase64ImageData = (image) => {
    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = () => {
      setImageData(reader.result);
    };
    reader.onerror = (error) => {
      setImageError(error);
    };
  };

  const extractImageMetadata = (image) => {
    const additionalMetadata = {
      name: "test",
      type: image.type,
    };
    setAdditionalMetadata(additionalMetadata);
  };

  useEffect(() => {
    if (image !== null) {
      extractBase64ImageData(image);
      extractImageMetadata(image);
    }
  }, [image]);

  return {
    additionalMetadata,
    imageData,
    imageError,
  };
}
