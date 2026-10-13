"use client";

/**
 * @fileoverview Pure scan media preview primitive.
 * @module app/domains/invoices/_cards/ScanMediaPreview
 */

import {type ReactNode, useCallback} from "react";
import {TbFileTypePdf, TbMaximize, TbPhotoOff, TbZoomIn} from "react-icons/tb";
import styles from "./ScanMediaPreview.module.scss";

export type ScanMediaKind = "image" | "pdf" | "unknown";

type Props = Readonly<{
  src: string;
  mediaKind: ScanMediaKind;
  alt: string;
  loading?: "eager" | "lazy";
  onPreviewActivate?: () => void;
  topLeftOverlay?: ReactNode;
  topRightOverlay?: ReactNode;
  bottomLeftOverlay?: ReactNode;
  bottomRightOverlay?: ReactNode;
  centerOverlay?: ReactNode;
}>;

function ScanMedia({src, mediaKind, alt, loading}: Readonly<Pick<Props, "src" | "mediaKind" | "alt" | "loading">>): React.JSX.Element | null {
  if (src && mediaKind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- scan URLs can be object/blob URLs and should bypass next/image processing.
      <img
        src={src}
        alt={alt}
        className={styles["imagePreview"]}
        loading={loading}
        decoding='async'
      />
    );
  }
  if (src && mediaKind === "pdf") {
    return (
      <div className={styles["placeholder"]}>
        <TbFileTypePdf
          aria-hidden='true'
          className={styles["pdfIcon"]}
        />
        <span className={styles["placeholderLabel"]}>PDF</span>
      </div>
    );
  }
  if (!src || mediaKind === "unknown") {
    return (
      <div className={styles["placeholder"]}>
        <TbPhotoOff
          aria-hidden='true'
          className={styles["missingIcon"]}
        />
        <span className={styles["placeholderLabel"]}>No preview</span>
      </div>
    );
  }
  return null;
}

/**
 * Renders scan media without owning route-specific scan behavior.
 *
 * @param props - Media preview props.
 * @returns A scan image, PDF placeholder, or missing preview placeholder.
 */
export function ScanMediaPreview({
  src,
  mediaKind,
  alt,
  loading = "lazy",
  onPreviewActivate,
  topLeftOverlay,
  topRightOverlay,
  bottomLeftOverlay,
  bottomRightOverlay,
  centerOverlay,
}: Readonly<Props>): React.JSX.Element {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!onPreviewActivate) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPreviewActivate();
      }
    },
    [onPreviewActivate],
  );

  const isInteractive = Boolean(onPreviewActivate);

  const content = (
    <>
      <ScanMedia
        src={src}
        mediaKind={mediaKind}
        alt={alt}
        loading={loading}
      />

      {isInteractive ? (
        <div className={styles["previewOverlay"]}>
          {mediaKind === "pdf" ? <TbMaximize className={styles["previewIcon"]} /> : <TbZoomIn className={styles["previewIcon"]} />}
        </div>
      ) : null}

      {topLeftOverlay ? <div className={styles["topLeft"]}>{topLeftOverlay}</div> : null}
      {topRightOverlay ? <div className={styles["topRight"]}>{topRightOverlay}</div> : null}
      {bottomLeftOverlay ? <div className={styles["bottomLeft"]}>{bottomLeftOverlay}</div> : null}
      {bottomRightOverlay ? <div className={styles["bottomRight"]}>{bottomRightOverlay}</div> : null}
      {centerOverlay ? <div className={styles["centerOverlay"]}>{centerOverlay}</div> : null}
    </>
  );

  if (onPreviewActivate) {
    return (
      <div
        className={`${styles["previewArea"]} ${styles["interactive"]}`}
        role='button'
        aria-label={alt}
        tabIndex={0}
        onClick={onPreviewActivate}
        onKeyDown={handleKeyDown}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={styles["previewArea"]}
      role='img'
      aria-label={alt}>
      {content}
    </div>
  );
}
