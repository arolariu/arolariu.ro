import {useTranslations} from "next-intl";
import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  const t = useTranslations("Errors.notFound");
  return (
    <section>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <Link href="/">{t("buttons.returnButton")}</Link>
    </section>
  );
}
