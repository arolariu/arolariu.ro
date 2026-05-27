"use client";

import {useTranslations} from "next-intl-selector";
import {useEffect} from "react";

type ProfileErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function ProfileError({error, reset}: ProfileErrorProps): React.JSX.Element {
  const t = useTranslations();

  useEffect(() => {
    console.error("[app/my-profile/error.tsx]", error);
  }, [error]);

  return (
    <section
      role='alert'
      aria-live='assertive'
      data-scope='my-profile'>
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
