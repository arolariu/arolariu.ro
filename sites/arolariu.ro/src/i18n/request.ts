/** @format */
import {getCookie} from "@/lib/actions/cookies.action";
import {getRequestConfig} from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = (await getCookie({name: "locale"})) ?? "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
