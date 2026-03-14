/// <reference types="vitest/globals" />
/* global describe, expect, it */

import {render} from "@testing-library/react";
import * as React from "react";

/**
 * Represents the constructor signature used by `expect(...).toBeInstanceOf(...)`.
 */
type InstanceConstructor<InstanceType extends object> = abstract new (...args: never[]) => InstanceType;

/**
 * Represents the configuration accepted by {@link isConformant}.
 */
interface ConformanceOptions<
  RequiredProps extends Record<string, unknown> = Record<string, never>,
  RefInstance extends object = HTMLElement,
> {
  /**
   * Expected `displayName` of the component.
   */
  readonly displayName: string;
  /**
   * Component under test.
   */
  readonly Component: React.ElementType;
  /**
   * Whether to validate ref forwarding behavior.
   *
   * @defaultValue false
   */
  readonly testRef?: boolean;
  /**
   * Expected ref element type.
   */
  readonly refType?: InstanceConstructor<RefInstance>;
  /**
   * Required props for the component to render successfully.
   */
  readonly requiredProps?: RequiredProps;
  /**
   * Whether to validate `className` passthrough.
   *
   * @defaultValue true
   */
  readonly testClassName?: boolean;
  /**
   * Whether to skip the baseline render assertion.
   *
   * @defaultValue false
   */
  readonly skipRender?: boolean;
}

/**
 * Runs a standard conformance test suite against a component.
 *
 * @remarks
 * Verifies a representative set of library guarantees:
 * - stable `displayName`
 * - render without throwing
 * - `className` passthrough to the root element
 * - ref forwarding, when requested
 *
 * @example
 * ```tsx
 * isConformant({
 *   displayName: "Button",
 *   Component: Button,
 *   testRef: true,
 *   refType: HTMLButtonElement,
 * });
 * ```
 */
export function isConformant<
  RequiredProps extends Record<string, unknown> = Record<string, never>,
  RefInstance extends object = HTMLElement,
>({
  displayName,
  Component,
  testRef = false,
  refType,
  requiredProps,
  testClassName = true,
  skipRender = false,
}: Readonly<ConformanceOptions<RequiredProps, RefInstance>>): void {
  if (testRef && refType === undefined) {
    throw new Error(`Conformance test for "${displayName}" requires "refType" when "testRef" is enabled.`);
  }

  describe(`${displayName} conformance`, () => {
    it("has correct displayName", () => {
      expect(Reflect.get(Component as object, "displayName")).toBe(displayName);
    });

    if (!skipRender) {
      it("renders without crashing", () => {
        expect(() => {
          const {unmount} = render(<Component {...(requiredProps ?? {})} />);
          unmount();
        }).not.toThrow();
      });
    }

    if (testClassName && !skipRender) {
      it("passes className to the root element", () => {
        const testClassName = "conformance-test-class";
        const {container} = render(
          <Component
            {...(requiredProps ?? {})}
            className={testClassName}
          />,
        );

        expect(container.querySelector(`.${testClassName}`)).toBeTruthy();
      });
    }

    if (testRef && refType !== undefined) {
      it("forwards ref correctly", () => {
        let currentRef: RefInstance | null = null;

        render(
          <Component
            {...(requiredProps ?? {})}
            ref={(value: RefInstance | null) => {
              currentRef = value;
            }}
          />,
        );

        expect(currentRef).toBeInstanceOf(refType);
      });
    }
  });
}

export type {ConformanceOptions};
