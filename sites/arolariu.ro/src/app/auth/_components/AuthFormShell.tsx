"use client";

import Link from "next/link";
import styles from "./AuthFormShell.module.scss";

type Props = Readonly<{
  kicker: string;
  secondaryPrompt: string;
  secondaryAction: string;
  secondaryHref: string;
  footer: string;
  children: React.ReactNode;
}>;

export default function AuthFormShell(props: Readonly<Props>): React.JSX.Element {
  return (
    <div className={styles["shell"]}>
      <div>
        <p className={styles["kicker"]}>{props.kicker}</p>
        <p className={styles["secondary"]}>
          {props.secondaryPrompt}{" "}
          <Link
            href={props.secondaryHref}
            className={styles["secondaryLink"]}>
            {props.secondaryAction}
          </Link>
        </p>
      </div>

      {props.children}

      <p className={styles["footer"]}>{props.footer}</p>
    </div>
  );
}
