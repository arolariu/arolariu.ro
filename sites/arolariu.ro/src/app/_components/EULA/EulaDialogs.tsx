/** @format */
"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {useTranslations} from "next-intl";
import {Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay} from "react-aria-components";

const DialogMenu = ({
  children,
  title,
}: Readonly<{
  children: React.ReactNode;
  title: string;
}>) => {
  return (
    <DialogTrigger>
      <Button className='m-4 w-1/2 p-4'>{title}</Button>
      <ModalOverlay className='center fixed inset-0 h-full w-full overflow-y-scroll bg-white bg-opacity-95 dark:bg-black'>
        <Modal
          isDismissable
          className='flex flex-col items-center justify-center justify-items-center'>
          <Dialog className='flex w-1/2 flex-col items-center justify-center justify-items-center'>
            <Heading className='m-4 text-center text-3xl font-black'>{title}</Heading>
            <article className='m-4 text-balance'>{children}</article>
            <Button
              slot='close'
              className='mx-auto my-4 h-4 w-4'>
              OK.
            </Button>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};

/**
 * The terms of service dialog component.
 */
export function TermsOfServiceDialogButton() {
  const t = useTranslations("termsOfService");
  const title = t("title");

  return (
    <DialogMenu title={title}>
      <RenderTermsOfServiceScreen />
    </DialogMenu>
  );
}

/**
 * The privacy policy dialog component.
 */
export function PrivacyPolicyDialogButton() {
  const t = useTranslations("privacyPolicy");
  const title = t("title");

  return (
    <DialogMenu title={title}>
      <RenderPrivacyPolicyScreen />
    </DialogMenu>
  );
}
