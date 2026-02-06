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
    <main className={styles["shell"]}>
      <main>
        <p className={styles["kicker"]}>{props.kicker}</p>
        <p className={styles["secondary"]}>
          {props.secondaryPrompt}{" "}
          <Link
            href={props.secondaryHref}
            className={styles["secondaryLink"]}>
            {props.secondaryAction}
          </Link>
        </p>
      </main>

      {props.children}

      <p className={styles["footer"]}>{props.footer}</p>
    </main>
  );
}
