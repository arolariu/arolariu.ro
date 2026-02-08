"use client";

import styles from "./AuthBulletList.module.scss";

type Props = Readonly<{
  bullets: ReadonlyArray<string>;
}>;

export default function AuthBulletList(props: Readonly<Props>): React.JSX.Element {
  return (
    <ul className={styles["list"]}>
      {props.bullets.map((bullet) => (
        <li
          key={bullet}
          className={styles["item"]}>
          <span
            className={styles["dot"]}
            aria-hidden='true'
          />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}
