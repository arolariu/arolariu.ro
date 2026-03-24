"use client";

import * as React from "react";

/**
 * Detects clicks or touch events outside a referenced element.
 *
 * @remarks
 * This hook is commonly used for implementing dropdown menus, modals, and popovers
 * that should close when the user interacts outside their boundaries. It listens
 * to both mouse and touch events to ensure broad device compatibility.
 *
 * The event listeners are automatically cleaned up when the component unmounts.
 *
 * @param ref - A ref object pointing to the element to monitor.
 * @param handler - Callback invoked when a click or touch occurs outside the element.
 *
 * @example
 * ```tsx
 * function Dropdown() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   const dropdownRef = useRef<HTMLDivElement>(null);
 *
 *   useOnClickOutside(dropdownRef, () => setIsOpen(false));
 *
 *   return (
 *     <div ref={dropdownRef}>
 *       {isOpen && <DropdownMenu />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: (event: MouseEvent | TouchEvent) => void): void {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;

      // Do nothing if clicking ref's element or descendent elements
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    globalThis.document.addEventListener("mousedown", listener);
    globalThis.document.addEventListener("touchstart", listener);

    return () => {
      globalThis.document.removeEventListener("mousedown", listener);
      globalThis.document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}
