"use client";

import {Toaster} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";

/**
 * Application-wide notification viewport with localized accessible names.
 *
 * @remarks
 * **Rendering Context**: Client Component rendered once inside the translation provider.
 *
 * - Receives every notification emitted through the `@arolariu/components` global `toast` manager
 *   (and therefore through `@/lib/notify`).
 * - Keeps the v3 persistent default (`timeout` 0): notifications stay until the user closes them.
 * - Localizes the per-notification close button and the viewport landmark name.
 *
 * @returns The mounted Toaster.
 */
export default function GlobalToaster(): React.JSX.Element {
  const t = useTranslations();
  const regionLabel = t((m) => m.shared.accessibility.notifications.region);

  return (
    <Toaster
      closeLabel={t((m) => m.shared.accessibility.notifications.close)}
      viewportProps={{"aria-label": regionLabel}}
    />
  );
}
