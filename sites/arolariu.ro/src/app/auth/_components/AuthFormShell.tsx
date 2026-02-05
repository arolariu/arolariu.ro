"use client";

import Link from "next/link";
import styles from "./styles.module.scss";

export type AuthFormShellProps = Readonly<{
  kicker: string;
  secondaryPrompt: string;
  secondaryAction: string;
  secondaryHref: string;
  footer: string;
  children: React.ReactNode;
}>;

export default function AuthFormShell(props: AuthFormShellProps): React.JSX.Element {
  return (
    <div className={styles["formShell"]}>
      <div className={styles["formShellHeader"]}>
        <p className={styles["formShellKicker"]}>{props.kicker}</p>
        <p className={styles["formShellSecondary"]}>
          {props.secondaryPrompt}{" "}
          <Link
            href={props.secondaryHref}
            className={styles["secondaryLink"]}>
            {props.secondaryAction}
          </Link>
        </p>
      </div>

      {props.children}

      <p className={styles["formShellFooter"]}>{props.footer}</p>
    </div>
  );
}
