"use client";

import {Badge} from "@arolariu/components";
import styles from "../Auth.module.scss";

export type AuthTrustBadgesRowProps = Readonly<{
  badges: ReadonlyArray<string>;
  className?: string;
}>;

export default function AuthTrustBadgesRow(props: AuthTrustBadgesRowProps): React.JSX.Element {
  return (
    <div className={props.className ?? styles["trustBadgesRow"]}>
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
