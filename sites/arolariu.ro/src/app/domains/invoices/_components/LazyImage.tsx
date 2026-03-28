/**
 * @fileoverview LazyImage component with intersection observer and blur placeholder.
 * @module @/app/domains/invoices/_components/LazyImage
 */

"use client";

import {Skeleton} from "@arolariu/components";
import Image from "next/image";
import {useCallback, useEffect, useRef, useState} from "react";
import styles from "./LazyImage.module.scss";

/**
 * Props for the LazyImage component.
 */
type Props = {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
};

/**
 * A lazy-loading image component that uses IntersectionObserver to defer loading
 * until the image enters the viewport. Shows a skeleton placeholder while loading.
 *
 * @param props - Component props
 * @returns LazyImage component
 *
 * @example
 * ```tsx
 * <LazyImage
 *   src="/images/invoice-preview.jpg"
 *   alt="Invoice preview"
 *   width={800}
 *   height={600}
 * />
 * ```
 */
export function LazyImage({src, alt, width = 800, height = 600, className = ""}: Readonly<Props>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {threshold: 0.1, rootMargin: "50px"},
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles["container"]} ${className}`}
      style={{width, height}}>
      {!isLoaded && <Skeleton className={styles["skeleton"]} />}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          className={`${styles["image"]} ${isLoaded ? styles["imageLoaded"] : ""}`}
          loading='lazy'
        />
      )}
    </div>
  );
}
