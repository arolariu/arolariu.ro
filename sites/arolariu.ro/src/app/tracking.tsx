/** @format */

import {SITE_ENV} from "@/lib/utils.generic";
import Script from "next/script";

/**
 * This function will insert the Microsoft Clarity tracking script into the website.
 * @returns The JSX for the Microsoft Clarity tracking script.
 */
function MicrosoftClarity() {
  const trackingId = SITE_ENV === "production" ? "mzhg9oq31x" : "mzhjusuzv1";
  return (
    <Script
      id='tracking-microsoft'
      strategy='afterInteractive'
      integrity=''>
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${trackingId}");
      `}
    </Script>
  );
}

/**
 * This function will insert the Google Analytics tracking script into the website.
 * @returns The JSX for the Google Analytics tracking script.
 */
function GoogleAnalytics() {
  const trackingId = SITE_ENV === "production" ? "G-WRFY2M3L07" : "G-92D06EVK0L";
  return (
    <Script
      id='tracking-google'
      strategy='afterInteractive'>
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag("js", new Date());
        gtag("config", "${trackingId}");
      `}
    </Script>
  );
}

/**
 * This function will insert the Hotjar Analytics tracking script into the website.
 * @returns The JSX for the Hotjar Analytics tracking script.
 */
function HotjarAnalytics() {
  const trackingId = SITE_ENV === "production" ? "5041812" : "5041816";
  return (
    <Script
      id='tracking-hotjar'
      strategy='afterInteractive'>
      {`
        (function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:${trackingId},hjsv:6};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
    </Script>
  );
}

/**
 * This function renders the tracking scripts for the website.
 * @returns The JSX for the tracking scripts.
 */
export default function Tracking(): React.JSX.Element {
  return (
    <>
      <MicrosoftClarity />
      <GoogleAnalytics />
      <HotjarAnalytics />
    </>
  );
}
