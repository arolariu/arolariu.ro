/** @format */
"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {useTranslations} from "next-intl";

const DialogMenu = ({
  children,
  title,
}: Readonly<{
  children: React.ReactNode;
  title: string;
}>) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          title={title}
          className='m-4 w-1/2 p-4'>
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent className='overflow-y-scroll 2xsm:max-h-[90vh] 2xsm:max-w-[90vw] md:max-h-[75vh] md:max-w-[75vw]'>
        <DialogHeader>
          <DialogTitle className='text-center'>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
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
