"use client";

/* eslint-disable react/jsx-handler-names */

import {GripVertical} from "lucide-react";
import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import {cn} from "@/lib/utilities";

import styles from "./resizable.module.css";

/**
 * Props for the {@link ResizablePanelGroup} component.
 */
export type ResizablePanelGroupProps = React.ComponentProps<typeof ResizablePrimitive.PanelGroup>;

/**
 * Props for the {@link ResizablePanel} component.
 */
export type ResizablePanelProps = React.ComponentProps<typeof ResizablePrimitive.Panel>;

/**
 * Props for the {@link ResizableHandle} component.
 */
export interface ResizableHandleProps extends React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> {
  /** Renders a visible drag grip inside the resize handle. @default false */
  withHandle?: boolean;
}

/**
 * Wraps `react-resizable-panels` panel groups with shared styles.
 *
 * @remarks
 * - Third-party wrapper component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ResizablePanelGroup direction='horizontal'>...</ResizablePanelGroup>
 * ```
 *
 * @see {@link ResizablePanelGroupProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizablePanelGroup({
  className,
  ...props
}: Readonly<ResizablePanelGroupProps>): React.JSX.Element {
  return (
    <ResizablePrimitive.PanelGroup
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
 * <ResizablePanel defaultSize={50}>Content</ResizablePanel>
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
 * - Third-party wrapper component
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
function ResizableHandle({
  withHandle = false,
  className,
  ...props
}: Readonly<ResizableHandleProps>): React.JSX.Element {
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={cn(styles.handle, className)}
      {...props}>
      {Boolean(withHandle) && (
        <div className={styles.handleGrip}>
          <GripVertical className={styles.handleGripIcon} />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

ResizablePanelGroup.displayName = "ResizablePanelGroup";
ResizablePanel.displayName = "ResizablePanel";
ResizableHandle.displayName = "ResizableHandle";

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
