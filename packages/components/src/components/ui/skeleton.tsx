import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./skeleton.module.css";

function Skeleton({className, ...props}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(styles.skeleton, className)}
      {...props}
    />
  );
}

export {Skeleton};
