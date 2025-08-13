export default {
  start: () => {
    try {
      const id = "hvhwmt03k3";
      if (typeof window === "undefined" || typeof document === "undefined")
        return;
      // Avoid double-injecting
      const w = /** @type {any} */ (window);
      if (
        typeof w.clarity === "function" ||
        document.querySelector('script[src^="https://www.clarity.ms/tag/"]')
      ) {
        return;
      }

      // Insert the full Clarity snippet via an inline script tag
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.text = `\n        (function(c,l,a,r,i,t,y){\n            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};\n            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;\n            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);\n        })(window, document, "clarity", "script", "${id}");\n      `;
      (document.head || document.documentElement).appendChild(s);

      // Optional tag to help verify in DevTools that injection ran
      document.documentElement.setAttribute("data-clarity-loaded", "true");

      // Mark platform once clarity is available
      const markPlatform = () => {
        try {
          w.clarity && w.clarity("set", "platform", "docfx");
        } catch (_) {
          /* no-op */
        }
      };
      if (typeof w.clarity === "function") {
        markPlatform();
      } else {
        let tries = 0;
        const iv = setInterval(() => {
          if (typeof w.clarity === "function") {
            clearInterval(iv);
            markPlatform();
          } else if (++tries > 50) {
            clearInterval(iv);
          }
        }, 200);
      }
    } catch (_) {
      /* no-op */
    }
  },
};
