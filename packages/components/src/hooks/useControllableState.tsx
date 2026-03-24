"use client";

import * as React from "react";

/**
 * Options for configuring controllable state behavior.
 *
 * @typeParam T - The type of the state value.
 */
export interface UseControllableStateOptions<T> {
  /**
   * The controlled value from props. When provided, the component operates in controlled mode.
   */
  controlled?: T;
  /**
   * The default value used when the component is uncontrolled.
   */
  defaultValue: T;
  /**
   * Callback fired when the internal state changes in controlled mode.
   *
   * @param value - The new state value.
   */
  onChange?: (value: T) => void;
}

/**
 * Manages state that can be either controlled or uncontrolled.
 *
 * @remarks
 * This hook enables components to support both controlled and uncontrolled patterns
 * seamlessly. When a `controlled` value is provided, it takes precedence; otherwise,
 * the hook manages internal state initialized with `defaultValue`.
 *
 * @typeParam T - The type of the state value.
 * @param options - Configuration object for controllable state.
 * @returns A tuple containing the current state value and a setter function.
 *
 * @example
 * ```tsx
 * function CustomInput({value, defaultValue = "", onChange}) {
 *   const [internalValue, setValue] = useControllableState({
 *     controlled: value,
 *     defaultValue,
 *     onChange,
 *   });
 *
 *   return (
 *     <input
 *       type="text"
 *       value={internalValue}
 *       onChange={(e) => setValue(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useControllableState<T>(options: UseControllableStateOptions<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const {controlled, defaultValue, onChange} = options;
  const [uncontrolledState, setUncontrolledState] = React.useState<T>(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolledState;

  const setValue = React.useCallback(
    (nextValue: T | ((prev: T) => T)) => {
      if (!isControlled) {
        setUncontrolledState((currentValue) => {
          const resolvedValue = typeof nextValue === "function" ? (nextValue as (prev: T) => T)(currentValue) : nextValue;
          onChange?.(resolvedValue);
          return resolvedValue;
        });
      } else {
        const resolvedValue = typeof nextValue === "function" ? (nextValue as (prev: T) => T)(controlled as T) : nextValue;
        onChange?.(resolvedValue);
      }
    },
    [isControlled, onChange, controlled],
  );

  return [value, setValue];
}
