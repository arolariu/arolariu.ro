"use client";

import {RouteErrorContent} from "@/app/_components/RouteErrorContent";
import {useEffect} from "react";

type AppErrorProps = Readonly<{
  error: Error & {digest?: string};
  reset: () => void;
}>;

export default function AppError({error, reset}: AppErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <RouteErrorContent
      error={error}
      reset={reset}
    />
  );
}
