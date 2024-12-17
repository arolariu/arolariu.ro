/** @format */
"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {DialogWrapper} from "@/presentation/DialogWrapper";
import {useTranslations} from "next-intl";
import {Button} from "react-aria-components";

/**
 * The terms of service dialog component.
 */
export function TermsOfServiceDialogButton() {
  const t = useTranslations("termsOfService");
  const title = <p>{t("title")}</p>;
  const callToActionButton = <Button className='m-4 w-1/2 p-4'>{title}</Button>;

  return (
    <DialogWrapper
      callToActionButton={callToActionButton}
      title={title}>
      <RenderTermsOfServiceScreen />
    </DialogWrapper>
  );
}

/**
 * The privacy policy dialog component.
 */
export function PrivacyPolicyDialogButton() {
  const t = useTranslations("privacyPolicy");
  const title = <p>{t("title")}</p>;
  const callToActionButton = <Button className='m-4 w-1/2 p-4'>{title}</Button>;

  return (
    <DialogWrapper
      callToActionButton={callToActionButton}
      title={title}>
      <RenderPrivacyPolicyScreen />
    </DialogWrapper>
  );
}
