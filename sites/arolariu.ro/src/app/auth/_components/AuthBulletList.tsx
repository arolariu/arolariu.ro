"use client";

import type {ReactNode} from "react";
import styles from "./styles.module.scss";

export type AuthBulletListProps = Readonly<{
  bullets: ReadonlyArray<string>;
  className?: string;
  bulletAdornment?: ReactNode;
}>;

export default function AuthBulletList(props: AuthBulletListProps): React.JSX.Element {
  const bulletAdornment = props.bulletAdornment ?? (
    <span
      aria-hidden='true'
      className={styles["authBulletDot"]}
    />
  );

  return (
    <ul className={props.className ?? styles["authBulletList"]}>
      {props.bullets.map((bullet) => (
        <li
          key={bullet}
          className={styles["authBulletItem"]}>
          {bulletAdornment}
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
