/**
 * @fileoverview Real-provider harness for analysis UI integration tests.
 * @module tests/helpers/analysis
 */

import {Toaster, toast} from "@arolariu/components";
import {NextIntlClientProvider} from "next-intl";
import type {ReactNode} from "react";

import enMessages from "../../messages/en.json";

/**
 * Provides the production i18n catalog and notification viewport to analysis tests.
 *
 * @param props - Test subtree to render with production-equivalent providers.
 * @returns The provider-wrapped test subtree.
 */
export function AnalysisTestProvider({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
  return (
    <NextIntlClientProvider
      locale='en'
      messages={enMessages}
      timeZone='Europe/Bucharest'>
      {children}
      <Toaster />
    </NextIntlClientProvider>
  );
}

/**
 * Clears active imperative notifications between analysis test cases.
 */
export function resetAnalysisToasts(): void {
  toast.dismiss();
}
