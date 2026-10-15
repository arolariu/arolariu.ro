"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Button, type ButtonProps, type ButtonState} from "./button";
import styles from "./attachment.module.css";

/** Caller-owned presentation status; this family never uploads or processes files. */
export type AttachmentStatus = "idle" | "uploading" | "processing" | "error" | "done";
/** Supported attachment density presets. */
export type AttachmentSize = "default" | "sm" | "xs";
/** Supported attachment layout directions. */
export type AttachmentOrientation = "horizontal" | "vertical";
/** Supported attachment media treatments. */
export type AttachmentMediaVariant = "icon" | "image";

/** Native attachment container props with caller-owned visual state. */
export type AttachmentProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Presentation status. @default "done" */
    state?: AttachmentStatus;
    /** Density preset. @default "default" */
    size?: AttachmentSize;
    /** Layout direction. @default "horizontal" */
    orientation?: AttachmentOrientation;
  }
>;
/** Native horizontally scrolling attachment collection props. */
export type AttachmentGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native media container props; images and icons remain caller-owned. */
export type AttachmentMediaProps = Readonly<React.ComponentPropsWithRef<"div"> & {variant?: AttachmentMediaVariant}>;
/** Native attachment text container props. */
export type AttachmentContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native single-line title props; the complete text remains accessible. */
export type AttachmentTitleProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native single-line description props. */
export type AttachmentDescriptionProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native action collection props, layered above the covering trigger. */
export type AttachmentActionsProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Reviewed Button props; defaults to ghost and icon-xs. */
export type AttachmentActionProps = Readonly<ButtonProps & ({readonly "aria-label": string} | {readonly "aria-labelledby": string})>;
/** Actual Button-owned interaction and visual state for action render callbacks. */
export type AttachmentActionState = ButtonState;
/** State owned by the native attachment trigger renderer. */
export type AttachmentTriggerState = Readonly<{slot: "attachment-trigger"}>;

type AttachmentTriggerRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/** Native trigger props with Base UI composition and a ref to the actual target. */
export type AttachmentTriggerProps = Readonly<
  Omit<useRender.ComponentProps<"button", AttachmentTriggerState, AttachmentTriggerRenderProps>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
  }
>;

const sizeStyles: Record<AttachmentSize, string | undefined> = {
  default: styles.sizeDefault,
  sm: styles.sizeSm,
  xs: styles.sizeXs,
};
const orientationStyles: Record<AttachmentOrientation, string | undefined> = {
  horizontal: styles.horizontal,
  vertical: styles.vertical,
};
const mediaStyles: Record<AttachmentMediaVariant, string | undefined> = {
  icon: styles.mediaIcon,
  image: styles.mediaImage,
};

/**
 * Displays caller-provided file content and status without owning a file lifecycle.
 * Supply names/status copy and any live-region semantics at the application boundary.
 */
const Attachment = ({
  ref,
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  ...props
}: Readonly<Attachment.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment'
    data-state={state}
    data-size={size}
    data-orientation={orientation}
    className={cn(styles.attachment, sizeStyles[size], orientationStyles[orientation], className)}
    {...props}
  />
);
Attachment.displayName = "Attachment";

/** Groups attachments in a wrapping native container without hiding filenames at narrow widths. */
const AttachmentGroup = ({ref, className, ...props}: Readonly<AttachmentGroup.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-group'
    className={cn(styles.group, className)}
    {...props}
  />
);
AttachmentGroup.displayName = "AttachmentGroup";

/** Hosts caller-provided icons or images; image loading and accessible text are caller-owned. */
const AttachmentMedia = ({ref, className, variant = "icon", ...props}: Readonly<AttachmentMedia.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-media'
    data-variant={variant}
    className={cn(styles.media, mediaStyles[variant], className)}
    {...props}
  />
);
AttachmentMedia.displayName = "AttachmentMedia";

/** Provides the shrinking text area beside or below attachment media. */
const AttachmentContent = ({ref, className, ...props}: Readonly<AttachmentContent.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-content'
    className={cn(styles.content, className)}
    {...props}
  />
);
AttachmentContent.displayName = "AttachmentContent";

/** Displays the full attachment title, including at narrow widths and increased text spacing. */
const AttachmentTitle = ({ref, className, ...props}: Readonly<AttachmentTitle.Props>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='attachment-title'
    className={cn(styles.title, className)}
    {...props}
  />
);
AttachmentTitle.displayName = "AttachmentTitle";

/** Displays caller-provided supporting text, including explicit loading/error descriptions. */
const AttachmentDescription = ({ref, className, ...props}: Readonly<AttachmentDescription.Props>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='attachment-description'
    className={cn(styles.description, className)}
    {...props}
  />
);
AttachmentDescription.displayName = "AttachmentDescription";

/** Hosts independent action controls above the covering attachment trigger. */
const AttachmentActions = ({ref, className, ...props}: Readonly<AttachmentActions.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-actions'
    className={cn(styles.actions, className)}
    {...props}
  />
);
AttachmentActions.displayName = "AttachmentActions";

/**
 * Delegates interaction, composition, cancellation and refs to the reviewed Button.
 * Icon-only actions require a caller-supplied accessible name.
 */
const AttachmentAction = ({
  ref,
  className,
  variant = "ghost",
  size = "icon-xs",
  ...props
}: Readonly<AttachmentAction.Props>): React.JSX.Element => (
  <Button
    ref={ref}
    data-slot='attachment-action'
    variant={variant}
    size={size}
    className={cn(styles.action, className)}
    {...props}
  />
);
AttachmentAction.displayName = "AttachmentAction";

/**
 * Covers an attachment with a native non-submitting button or a composed target.
 *
 * Render elements preserve child content, refs, ARIA and child-first handlers.
 * Native default/intrinsic button targets default to type="button"; callback or
 * custom targets own their native type/role/keyboard semantics. Links receive no
 * invented button type or role. Place this beside, not around, AttachmentActions.
 */
const AttachmentTrigger = ({ref, className, render, type, ...props}: Readonly<AttachmentTrigger.Props>): React.ReactElement =>
  useRender<AttachmentTrigger.State, HTMLElement>({
    defaultTagName: "button",
    ref,
    render,
    state: {slot: "attachment-trigger"},
    props: mergeProps<"button">(
      {
        type: !render || (React.isValidElement(render) && render.type === "button") ? (type ?? "button") : type,
        className: cn(styles.trigger, className),
      },
      props,
    ),
  });
AttachmentTrigger.displayName = "AttachmentTrigger";

// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace Attachment {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentGroupProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentMedia {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentMediaProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentContentProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentTitle {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentTitleProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentDescription {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentDescriptionProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentActions {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentActionsProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentAction {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentActionProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- Button-owned state is forwarded unchanged
  export type State = AttachmentActionState;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace AttachmentTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = AttachmentTriggerProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type State = AttachmentTriggerState;
}

export {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
};
