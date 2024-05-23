/** @format */

"use client";

import {useReportWebVitals} from "next/web-vitals";

/**
 *
 */
export function WebVitals() {
  useReportWebVitals((report) => console.log(report));
  return undefined;
}
