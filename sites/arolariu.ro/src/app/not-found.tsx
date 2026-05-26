"use client";

import {useTranslations} from "next-intl-selector";
import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  const t = useTranslations();
  return (
    <section>
      <h1>{t((m) => m.Errors.notFound.title)}</h1>
      <p>{t((m) => m.Errors.notFound.subtitle)}</p>
      <Link href='/'>{t((m) => m.Errors.notFound.buttons.returnButton)}</Link>
    </section>
  );
}
