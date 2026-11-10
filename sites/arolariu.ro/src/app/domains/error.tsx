"use client";

import {RouteErrorContent} from "@/app/_components/RouteErrorContent";
import {useEffect} from "react";

type DomainsErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function DomainsError({error, reset}: DomainsErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("[app/domains/error.tsx]", error);
  }, [error]);

  return (
    <RouteErrorContent
      error={error}
      reset={reset}
      scope='domains'
    />
  );
}
