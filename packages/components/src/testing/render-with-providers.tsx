import {render, type RenderOptions, type RenderResult} from "@testing-library/react";
import * as React from "react";

/**
 * Represents the additional provider configuration accepted by {@link renderWithProviders}.
 */
interface ProviderOptions {
  /**
   * Additional wrapper component applied around the rendered UI.
   */
  readonly wrapper?: React.ComponentType<{readonly children: React.ReactNode}>;
}

/**
 * Renders React UI wrapped with the component library's required test providers.
 *
 * @remarks
 * Extend this helper as the library introduces shared providers such as theming,
 * localization, or feature-flag context.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Readonly<ProviderOptions & Omit<RenderOptions, "wrapper">>,
): RenderResult {
  const {wrapper: CustomWrapper, ...renderOptions} = options ?? {};

  function Wrapper({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
    if (CustomWrapper !== undefined) {
      return <CustomWrapper>{children}</CustomWrapper>;
    }

    return React.createElement(React.Fragment, null, children);
  }

  return render(ui, {wrapper: Wrapper, ...renderOptions});
}

export type {ProviderOptions};
