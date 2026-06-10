"use client";

import type {ImgHTMLAttributes} from "react";

type StaticImageSource = Readonly<{
  src: string;
}>;

type StorybookImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> &
  Readonly<{
    src: string | StaticImageSource;
    fill?: boolean;
    priority?: boolean;
    quality?: number | `${number}`;
    unoptimized?: boolean;
    loader?: unknown;
  }>;

/**
 * Storybook-safe replacement for next/image.
 *
 * @param props - Image props.
 * @returns A regular image element.
 */
export default function Image({
  src,
  fill: _fill,
  priority: _priority,
  quality: _quality,
  unoptimized: _unoptimized,
  loader: _loader,
  ...imageProps
}: StorybookImageProps): React.JSX.Element {
  const resolvedSource = typeof src === "string" ? src : src.src;

  // eslint-disable-next-line @next/next/no-img-element -- Storybook mock intentionally replaces next/image with a plain image.
  return (
    <img
      {...imageProps}
      src={resolvedSource}
    />
  );
}
