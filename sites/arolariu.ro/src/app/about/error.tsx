"use client";

import {RouteErrorContent} from "@/app/_components/RouteErrorContent";
import {useEffect} from "react";

type AboutErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AboutError({error, reset}: AboutErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("[app/about/error.tsx]", error);
  }, [error]);

  return (
    <RouteErrorContent
      error={error}
      reset={reset}
      scope='about'
    />
  );
}
