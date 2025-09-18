import {useTranslations} from "next-intl";
import AuthCard from "./_components/AuthCard";

/**
 * The client-side authentication screen.
 * @returns The authentication screen.
 */
export default function RenderAuthScreen(): React.JSX.Element {
  const t = useTranslations("Authentication.Island");

  return (
    <section className='2xsm:flex-col flex gap-4 md:flex-row'>
      <AuthCard
        cardType='sign-up'
        title='Sign up'
        ctaText='Sign up x50'
        description='Sign up!!'
      />
      <AuthCard
        cardType='sign-in'
        title={t("title")}
        ctaText={t("callToAction")}
        description={t("description")}
      />
    </section>
  );
}
