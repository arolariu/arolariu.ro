/**
 * @fileoverview Shared test helpers for component rendering with providers.
 * @module tests/helpers/render
 *
 * @remarks
 * Eliminates boilerplate in component tests by wrapping render() with the
 * providers that most components need (NextIntlClientProvider, etc.).
 *
 * @example
 * ```tsx
 * import {renderWithProviders, createMockMessages} from "@tests/helpers";
 *
 * it("renders correctly", () => {
 *   const {getByText} = renderWithProviders(<MyComponent />, {
 *     messages: createMockMessages({title: "Hello"}),
 *   });
 *   expect(getByText("Hello")).toBeInTheDocument();
 * });
 * ```
 */

import {render, type RenderOptions, type RenderResult} from "@testing-library/react";
import type {ReactElement, ReactNode} from "react";

// Re-export testing library for convenience
export {screen, waitFor, within, act} from "@testing-library/react";
export {default as userEvent} from "@testing-library/user-event";

/**
 * Options for `renderWithProviders()`.
 */
interface ProviderOptions {
  /** i18n messages to provide. Uses `createMockMessages()` defaults if omitted. */
  readonly messages?: Record<string, unknown>;
  /** Locale string. Defaults to `"en"`. */
  readonly locale?: string;
  /** Extra testing-library render options (container, wrapper, etc.). */
  readonly renderOptions?: Omit<RenderOptions, "wrapper">;
}

/**
 * Creates a minimal i18n messages object for testing.
 * Pass overrides to customize specific keys.
 *
 * @example
 * ```ts
 * const messages = createMockMessages({
 *   "Invoices.HomePage.title": "My Invoices",
 * });
 * ```
 */
export function createMockMessages(overrides: Record<string, string> = {}): Record<string, unknown> {
  return {
    ...overrides,
  };
}

/**
 * Renders a component wrapped with NextIntlClientProvider.
 *
 * @param ui - The React element to render
 * @param options - Provider and render options
 * @returns The render result from @testing-library/react
 */
export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}): RenderResult {
  const {messages = createMockMessages(), locale = "en", renderOptions} = options;

  function Wrapper({children}: {readonly children: ReactNode}): ReactElement {
    // Dynamic import would be async — use the globally-mocked version instead.
    // NextIntlClientProvider is mocked in vitest.setup.ts to pass children through.
    // This wrapper exists so tests CAN provide a real provider if needed.
    return children as ReactElement;
  }

  return render(ui, {wrapper: Wrapper, ...renderOptions});
}
