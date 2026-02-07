"use client";

import {Badge} from "@arolariu/components";
import styles from "./AuthTrustBadgesRow.module.scss";

type Props = Readonly<{
  badges: ReadonlyArray<string>;
}>;

export default function AuthTrustBadgesRow(props: Readonly<Props>): React.JSX.Element {
  return (
    <div className={styles["row"]}>
      {props.badges.map((label) => (
        <Badge
          key={label}
          variant='secondary'>
          {label}
        </Badge>
      ))}
    </div>
  );
}
