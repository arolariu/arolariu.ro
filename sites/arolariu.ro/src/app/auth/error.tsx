"use client";

import {useTranslations} from "next-intl";
import {useEffect} from "react";

type AuthErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AuthError({error, reset}: AuthErrorProps): React.JSX.Element {
  const t = useTranslations("Errors.globalError");

  useEffect(() => {
    console.error("[app/auth/error.tsx]", error);
  }, [error]);

  return (
    <section
      role='alert'
      aria-live='assertive'
      data-scope='auth'>
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.subtitle")}</p>
      {error.digest ? (
        <p>
          <span>{t("details.errorIdLabel")}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button
        type='button'
        onClick={reset}>
        {t("buttons.tryAgain")}
      </button>
    </section>
  );
}
