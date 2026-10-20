"use client";

import * as React from "react";

/**
 * Live-region politeness for messages sent through {@link useAnnounce}.
 *
 * @remarks
 * `"polite"` waits until the screen reader is idle; `"assertive"` may interrupt current speech, so reserve it for urgent
 * messages such as errors.
 */
export type Politeness = "polite" | "assertive";

/**
 * Announces messages to screen readers through visually hidden ARIA live regions.
 *
 * @remarks
 * **DOM side effects**: after mount, each hook instance appends two visually hidden `div` elements to `document.body`,
 * both with `role="status"` and `aria-atomic="true"`, one `aria-live="polite"` and one `aria-live="assertive"`, and
 * removes them on unmount. Nothing renders in place and nothing exists during server rendering. Call the hook once in a
 * component that stays mounted, such as a list or a provider, and pass `announce` down instead of calling the hook in
 * every item, so regions do not multiply and are not removed together with the item that announced.
 *
 * **Timing**: `announce` empties the region of the requested politeness, then writes the message on the next animation
 * frame, so repeating the same text is announced again; when several calls reach one region before that frame, the last
 * message stays. Announcements made before the regions exist (during render, or before the hook's mount effect has run,
 * as in a child's mount effect, which runs first) or after unmount are dropped silently, and a message whose frame
 * arrives after unmount is lost with its region. Call `announce` from event handlers or effects, and mount the hook
 * before the change it reports: a live region that is created and filled at almost the same time is not a reliable
 * announcement.
 *
 * @returns A stable `announce(message, politeness?)` function; `politeness` defaults to `"polite"`.
 *
 * @example
 * ```tsx
 * function FileList({files, onRemove}: {files: readonly string[]; onRemove: (name: string) => Promise<void>}) {
 *   // The list stays mounted while its rows are removed, so it owns the announcer.
 *   const announce = useAnnounce();
 *
 *   async function remove(name: string) {
 *     try {
 *       await onRemove(name);
 *       announce(`${name} removed`);
 *     } catch {
 *       announce(`${name} could not be removed`, "assertive");
 *     }
 *   }
 *
 *   return (
 *     <ul>
 *       {files.map((name) => (
 *         <li key={name}>
 *           {name}
 *           <button type="button" onClick={() => void remove(name)}>
 *             Remove {name}
 *           </button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAnnounce(): (message: string, politeness?: Politeness) => void {
  const politeRef = React.useRef<HTMLDivElement | null>(null);
  const assertiveRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const createRegion = (politeness: Politeness): HTMLDivElement => {
      const element = document.createElement("div");

      element.setAttribute("role", "status");
      element.setAttribute("aria-live", politeness);
      element.setAttribute("aria-atomic", "true");

      Object.assign(element.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0",
      });

      document.body.append(element);

      return element;
    };

    politeRef.current = createRegion("polite");
    assertiveRef.current = createRegion("assertive");

    return () => {
      politeRef.current?.remove();
      assertiveRef.current?.remove();
      politeRef.current = null;
      assertiveRef.current = null;
    };
  }, []);

  return React.useCallback((message: string, politeness: Politeness = "polite") => {
    const region = politeness === "assertive" ? assertiveRef.current : politeRef.current;

    if (!region) {
      return;
    }

    region.textContent = "";

    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);
}
