"use client";

import {RouteErrorContent} from "@/app/_components/RouteErrorContent";
import {useEffect} from "react";

type AuthErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AuthError({error, reset}: AuthErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("[app/auth/error.tsx]", error);
  }, [error]);

  return (
    <RouteErrorContent
      error={error}
      reset={reset}
      scope='auth'
    />
  );
}
