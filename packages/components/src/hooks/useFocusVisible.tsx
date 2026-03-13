"use client";

import * as React from "react";

/**
 * Represents the focus handlers returned by {@link useFocusVisible}.
 *
 * @remarks
 * Spread these handlers onto the interactive element that should respond to keyboard
 * focus visibility. They coordinate transient focus styling without owning rendering.
 */
interface FocusVisibleProps {
  /**
   * Called when the target receives focus.
   */
  onFocus: (event: React.FocusEvent) => void;
  /**
   * Called when the target loses focus.
   */
  onBlur: () => void;
}

/**
 * Detects whether the current focus originated from keyboard navigation.
 *
 * @remarks
 * Tracks global keyboard and pointer input so consumers can render focus rings only when
 * users are tabbing through the interface. This mirrors the intent of `:focus-visible`
 * while remaining available to JavaScript-driven components and custom states.
 *
 * @returns An object containing the current focus-visible state and focus handlers to spread on the target element.
 *
 * @example
 * ```tsx
 * const {isFocusVisible, focusProps} = useFocusVisible();
 *
 * return (
 *   <button
 *     type="button"
 *     {...focusProps}
 *     className={isFocusVisible ? "ring" : undefined}>
 *     Click
 *   </button>
 * );
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible | MDN :focus-visible}
 */
export function useFocusVisible(): {
  isFocusVisible: boolean;
  focusProps: FocusVisibleProps;
} {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const isKeyboardRef = React.useRef(false);

  React.useEffect(() => {
    const onKeyDown = () => {
      isKeyboardRef.current = true;
    };
    const onPointerDown = () => {
      isKeyboardRef.current = false;
    };

    globalThis.document.addEventListener("keydown", onKeyDown, true);
    globalThis.document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown, true);
      globalThis.document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  const focusProps = React.useMemo<FocusVisibleProps>(() => ({
    onFocus: (_event: React.FocusEvent) => {
      if (isKeyboardRef.current) {
        setIsFocusVisible(true);
      }
    },
    onBlur: () => {
      setIsFocusVisible(false);
    },
  }), []);

  return {isFocusVisible, focusProps};
}
