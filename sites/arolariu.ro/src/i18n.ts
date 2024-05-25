/** @format */

import {getRequestConfig} from "next-intl/server";
import {getCookie} from "./lib/actions/cookies.action";

export default getRequestConfig(async () => {
  const locale = (await getCookie({name: "locale"})) || "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
