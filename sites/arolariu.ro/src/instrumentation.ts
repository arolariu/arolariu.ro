/** @format */

import {registerOTel, type Configuration} from "@vercel/otel";

/**
 *
 */
export function register() {
  registerOTel({
    serviceName: "arolariu.ro",
  } satisfies Configuration);
}
