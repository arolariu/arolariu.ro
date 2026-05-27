"use client";

import {useTranslations} from "next-intl-selector";
import {useEffect} from "react";

type AuthErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AuthError({error, reset}: AuthErrorProps): React.JSX.Element {
  const t = useTranslations();

  useEffect(() => {
    console.error("[app/auth/error.tsx]", error);
  }, [error]);

  return (
    <section
      role='alert'
      aria-live='assertive'
      data-scope='auth'>
      <h1>{t((m) => m.Errors.globalError.hero.title)}</h1>
      <p>{t((m) => m.Errors.globalError.hero.subtitle)}</p>
      {error.digest ? (
        <p>
          <span>{t((m) => m.Errors.globalError.details.errorIdLabel)}</span> <code>{error.digest}</code>
        </p>
      ) : null}
      <button
        type='button'
        onClick={reset}>
        {t((m) => m.Errors.globalError.buttons.tryAgain)}
      </button>
    </section>
  );
}
