"use client";

/* eslint-disable react/jsx-handler-names */

import {GripVertical} from "lucide-react";
import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import {cn} from "@/lib/utilities";

import styles from "./resizable.module.css";

function ResizablePanelGroup({
  className,
  ...props
}: Readonly<React.ComponentProps<typeof ResizablePrimitive.PanelGroup>>): React.JSX.Element {
  return (
    <ResizablePrimitive.PanelGroup
      className={cn(styles.group, className)}
      {...props}
    />
  );
}

const ResizablePanel = ResizablePrimitive.Panel;

function ResizableHandle({
  withHandle,
  className,
  ...props
}: Readonly<
  React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
    withHandle?: boolean;
  }
>): React.JSX.Element {
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

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
