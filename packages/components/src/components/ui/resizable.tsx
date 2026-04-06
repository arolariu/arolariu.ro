"use client";

/* eslint-disable react/jsx-handler-names */

import {GripVertical} from "lucide-react";
import * as React from "react";
import type {GroupImperativeHandle, PanelImperativeHandle} from "react-resizable-panels";
import * as ResizablePrimitive from "react-resizable-panels";

import {cn} from "@/lib/utilities";

import styles from "./resizable.module.css";

export type {GroupImperativeHandle, PanelImperativeHandle};

/**
 * Props for the {@link ResizablePanelGroup} component.
 */
export type ResizablePanelGroupProps = React.ComponentProps<typeof ResizablePrimitive.Group>;

/**
 * Props for the {@link ResizablePanel} component.
 */
export type ResizablePanelProps = React.ComponentProps<typeof ResizablePrimitive.Panel>;

/**
 * Props for the {@link ResizableHandle} component.
 *
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
export interface ResizableHandleProps extends React.ComponentProps<typeof ResizablePrimitive.Separator> {
  /**
   * Renders a visual drag grip inside the resize handle to indicate that adjacent panels can be resized.
   *
   * @default false
   * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
   */
  withHandle?: boolean;
}

/**
 * Wraps `react-resizable-panels` panel groups with shared styles.
 *
 * @remarks
 * - Third-party wrapper component (v4 API: `Group` with `orientation` prop)
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ResizablePanelGroup orientation='horizontal'>...</ResizablePanelGroup>
 * ```
 *
 * @see {@link ResizablePanelGroupProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizablePanelGroup({className, ...props}: Readonly<ResizablePanelGroupProps>): React.JSX.Element {
  return (
    <ResizablePrimitive.Group
      className={cn(styles.group, className)}
      {...props}
    />
  );
}

/**
 * Re-exports the underlying resizable panel primitive for consistent composition.
 *
 * @remarks
 * - Third-party wrapper component
 * - Styling is applied by parent panel group and handles
 *
 * @example
 * ```tsx
 * <ResizablePanel defaultSize="50%">Content</ResizablePanel>
 * ```
 *
 * @see {@link ResizablePanelProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
const ResizablePanel = ResizablePrimitive.Panel;

/**
 * Renders a draggable resize handle between resizable panels.
 *
 * @remarks
 * - Third-party wrapper component (v4 API: `Separator`)
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ResizableHandle withHandle />
 * ```
 *
 * @see {@link ResizableHandleProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizableHandle({withHandle = false, className, children, ...props}: Readonly<ResizableHandleProps>): React.JSX.Element {
  return (
    <ResizablePrimitive.Separator
      className={cn(styles.handle, className)}
      {...props}>
      {Boolean(withHandle) && (
        <div className={styles.handleGrip}>
          <GripVertical className={styles.handleGripIcon} />
        </div>
      )}
      {children}
    </ResizablePrimitive.Separator>
  );
}

ResizablePanelGroup.displayName = "ResizablePanelGroup";
ResizablePanel.displayName = "ResizablePanel";
ResizableHandle.displayName = "ResizableHandle";

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
