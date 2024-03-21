import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

/**
 * The offline fallback page.
 * @returns The offline fallback page.
 */
export default function Page() {
  return (
    <>
      <h1>This is an offline fallback page</h1>
      <h2>When offline, any page route will fallback to this page</h2>
    </>
  );
}
