"use client";

import {RouteErrorContent} from "@/app/_components/RouteErrorContent";
import {useEffect} from "react";

type ProfileErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function ProfileError({error, reset}: ProfileErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("[app/my-profile/error.tsx]", error);
  }, [error]);

  return (
    <RouteErrorContent
      error={error}
      reset={reset}
      scope='my-profile'
    />
  );
}
