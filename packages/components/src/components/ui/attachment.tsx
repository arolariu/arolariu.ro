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
    /**
     * Caller-owned presentation status, exposed as `data-state`: `idle` dashes the
     * border, `error` tints the border, media and description with the destructive
     * colour, and image media stays dimmed until `idle` or `done`. It adds no role
     * or announcement.
     * @default "done"
     */
    state?: AttachmentStatus;
    /** Density preset, exposed as `data-size`; it also scales direct media. @default "default" */
    size?: AttachmentSize;
    /**
     * Layout direction, exposed as `data-orientation`; `vertical` stacks the media
     * above the text and overlays the actions on the media's top inline-end corner.
     * @default "horizontal"
     */
    orientation?: AttachmentOrientation;
  }
>;
/** Native attachment collection props; attachments wrap onto new rows rather than scrolling horizontally. */
export type AttachmentGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native media container props; images and icons remain caller-owned. */
export type AttachmentMediaProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Media treatment: `icon` centres a caller icon on a muted square tile;
     * `image` crops a caller `<img>` to that tile and dims it while the attachment
     * is uploading, processing or errored.
     * @default "icon"
     */
    variant?: AttachmentMediaVariant;
  }
>;
/** Native attachment text container props. */
export type AttachmentContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native title props; long names wrap at any point instead of truncating, so the complete text stays visible. */
export type AttachmentTitleProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native supporting-text props; the description wraps like the title instead of truncating. */
export type AttachmentDescriptionProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native action collection props, layered above the covering trigger. */
export type AttachmentActionsProps = Readonly<React.ComponentPropsWithRef<"div">>;

/** Every attachment action needs its own string name, whatever its size. */
type AttachmentActionNamingProps = {readonly "aria-label": string} | {readonly "aria-labelledby": string};

/** Re-documents Button's presets per naming-union member, so each member keeps its required string name. */
type AttachmentActionPropsOf<Props> = Props extends ButtonProps
  ? Readonly<
      Omit<Props, "variant" | "size"> & {
        /**
         * Visual style variant; actions default to the transparent `ghost` treatment.
         * @default "ghost"
         */
        variant?: Props["variant"];
        /**
         * Size preset; actions default to the compact icon-only `icon-xs`. Every size, including text sizes,
         * still requires the action's string `aria-label` or `aria-labelledby`.
         * @default "icon-xs"
         */
        size?: Props["size"];
      }
    >
  : never;

/** Reviewed Button props with a required caller-supplied name and the `ghost`/`icon-xs` action presets. */
export type AttachmentActionProps = AttachmentActionPropsOf<Readonly<ButtonProps & AttachmentActionNamingProps>>;
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
 *
 * @remarks
 * - Renders a `<div>` without a role; compose {@link AttachmentMedia},
 *   {@link AttachmentContent}, an optional {@link AttachmentTrigger} and
 *   {@link AttachmentActions} inside it.
 * - Never uploads, processes or announces: `state` only styles the card. Supply
 *   names, status copy and any live-region announcements at the application
 *   boundary.
 * - Wraps instead of truncating: long titles and descriptions break onto new
 *   lines, so the full text stays visible at narrow widths, high zoom and
 *   increased text spacing.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Attachment state='uploading'>
 *   <AttachmentMedia>
 *     <FileText aria-hidden='true' />
 *   </AttachmentMedia>
 *   <AttachmentContent>
 *     <AttachmentTitle id='notes-title'>Meeting notes.txt</AttachmentTitle>
 *     <AttachmentDescription>Uploading, 45%</AttachmentDescription>
 *   </AttachmentContent>
 *   <AttachmentTrigger
 *     aria-labelledby='notes-title'
 *     onClick={openPreview}
 *   />
 *   <AttachmentActions>
 *     <AttachmentAction
 *       aria-label='Remove Meeting notes.txt'
 *       onClick={removeNotes}>
 *       <X aria-hidden='true' />
 *     </AttachmentAction>
 *   </AttachmentActions>
 * </Attachment>
 * ```
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

/**
 * Groups attachments in a wrapping native container without hiding filenames at narrow widths.
 *
 * @remarks
 * - Renders a `<div>`; attachments wrap onto new rows (`flex-wrap: wrap`) at
 *   their intrinsic widths instead of scrolling horizontally.
 * - Adds no role: pass `role="group"` with a name, or `role="list"` with
 *   `role="listitem"` attachments, when the collection needs semantics.
 *
 * @example
 * ```tsx
 * <AttachmentGroup
 *   role='group'
 *   aria-label='Attached files'>
 *   <Attachment>{budgetContent}</Attachment>
 *   <Attachment>{notesContent}</Attachment>
 * </AttachmentGroup>
 * ```
 */
const AttachmentGroup = ({ref, className, ...props}: Readonly<AttachmentGroup.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-group'
    className={cn(styles.group, className)}
    {...props}
  />
);
AttachmentGroup.displayName = "AttachmentGroup";

/**
 * Hosts caller-provided icons or images; image loading and accessible text are caller-owned.
 *
 * @remarks
 * - Renders a square `<div>` tile: `variant="icon"` (the default) centres an
 *   icon, `variant="image"` crops an `<img>` with `object-fit: cover`.
 * - The tile adds no name: hide decorative icons with `aria-hidden="true"` and
 *   give meaningful images a real `alt` (an empty `alt` when the title already
 *   names the file).
 *
 * @example
 * ```tsx
 * <AttachmentMedia variant='image'>
 *   <img
 *     src={previewUrl}
 *     alt=''
 *   />
 * </AttachmentMedia>
 * ```
 */
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

/**
 * Provides the shrinking text area beside or below attachment media.
 *
 * @remarks
 * - Renders a `<div>` that can shrink below its content width, so long text
 *   wraps instead of widening the attachment.
 * - Holds {@link AttachmentTitle} and {@link AttachmentDescription}.
 *
 * @example
 * ```tsx
 * <AttachmentContent>
 *   <AttachmentTitle>Budget.xlsx</AttachmentTitle>
 *   <AttachmentDescription>Ready · 24 KB</AttachmentDescription>
 * </AttachmentContent>
 * ```
 */
const AttachmentContent = ({ref, className, ...props}: Readonly<AttachmentContent.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='attachment-content'
    className={cn(styles.content, className)}
    {...props}
  />
);
AttachmentContent.displayName = "AttachmentContent";

/**
 * Displays the full attachment title, including at narrow widths and increased text spacing.
 *
 * @remarks
 * - Renders a block `<span>` whose long names wrap at any point
 *   (`overflow-wrap: anywhere`) rather than truncating.
 * - Give it an `id` and reference it from {@link AttachmentTrigger}'s
 *   `aria-labelledby`, so the visible filename names the trigger.
 *
 * @example
 * ```tsx
 * <AttachmentTitle id='report-title'>Quarterly-report-final-v3.pdf</AttachmentTitle>
 * ```
 */
const AttachmentTitle = ({ref, className, ...props}: Readonly<AttachmentTitle.Props>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='attachment-title'
    className={cn(styles.title, className)}
    {...props}
  />
);
AttachmentTitle.displayName = "AttachmentTitle";

/**
 * Displays caller-provided supporting text, including explicit loading/error descriptions.
 *
 * @remarks
 * - Renders a block `<span>` that wraps like the title; it takes the destructive
 *   colour in the `error` state.
 * - Changing its text is not announced. Pair status changes with a caller-owned
 *   live region, and reference the description from the trigger's
 *   `aria-describedby` to expose it with the trigger.
 *
 * @example
 * ```tsx
 * <AttachmentDescription id='report-status'>Upload failed: the file is larger than 10 MB</AttachmentDescription>
 * ```
 */
const AttachmentDescription = ({ref, className, ...props}: Readonly<AttachmentDescription.Props>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='attachment-description'
    className={cn(styles.description, className)}
    {...props}
  />
);
AttachmentDescription.displayName = "AttachmentDescription";

/**
 * Hosts independent action controls above the covering attachment trigger.
 *
 * @remarks
 * - Renders a `<div>` layered above {@link AttachmentTrigger}, so its controls
 *   stay operable over the covering trigger; in the vertical orientation it
 *   overlays the media's top inline-end corner.
 * - Keep it beside, not inside, the trigger: interactive controls cannot nest
 *   inside a button or link.
 *
 * @example
 * ```tsx
 * <AttachmentActions>
 *   <AttachmentAction
 *     aria-label='Remove Budget.xlsx'
 *     onClick={removeBudget}>
 *     <X aria-hidden='true' />
 *   </AttachmentAction>
 * </AttachmentActions>
 * ```
 */
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
 *
 * @remarks
 * - Renders the shared {@link Button} with `variant="ghost"` and
 *   `size="icon-xs"` unless overridden.
 * - The props type requires a caller-supplied, localized accessible name
 *   (`aria-label` or `aria-labelledby`). Name the file as well as the action,
 *   such as "Remove Budget.xlsx": icon-only actions have no visible text and
 *   every attachment repeats the same actions.
 *
 * @example
 * ```tsx
 * <AttachmentAction
 *   aria-label='Retry Budget.xlsx'
 *   onClick={retryBudget}>
 *   <RotateCcw aria-hidden='true' />
 * </AttachmentAction>
 * ```
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
 * @remarks
 * - Renders an empty `<button>` stretched over the whole attachment. Render
 *   elements preserve child content, refs, ARIA and child-first handlers.
 *   Native default/intrinsic button targets default to `type="button"`; callback
 *   or custom targets own their native type/role/keyboard semantics. Links
 *   receive no invented button type or role.
 * - Naming obligation: the default trigger has no visible text, so always name
 *   it, preferably with `aria-labelledby` pointing at the {@link AttachmentTitle}
 *   `id` (the visible filename), otherwise with a localized `aria-label` such as
 *   "Open Budget.xlsx". Add `aria-describedby` for the status description.
 * - Place this beside, not around, {@link AttachmentActions}, which stay layered
 *   above it.
 *
 * @example
 * ```tsx
 * <AttachmentTrigger
 *   aria-labelledby='report-title'
 *   aria-describedby='report-status'
 *   render={<a href='/files/report.pdf' />}
 * />
 * ```
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
