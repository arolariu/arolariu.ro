/**
 * @fileoverview Unified Result type and helpers for functional error handling.
 * @module result
 *
 * @remarks
 * Implements the Result pattern (also known as Either monad) for explicit,
 * type-safe error handling without exceptions. This pattern is common in
 * Rust, Haskell, and functional TypeScript codebases.
 *
 * **Design Philosophy:**
 * - Errors are values, not exceptions
 * - Callers must explicitly handle both success and failure cases
 * - No external dependencies (zero-cost abstraction)
 *
 * **When to Use:**
 * - Functions with recoverable failure modes
 * - Operations where callers need to decide how to handle errors
 * - APIs where throwing exceptions would be awkward (e.g., SSR detection)
 *
 * **When NOT to Use:**
 * - Unrecoverable errors (use exceptions)
 * - Simple functions that can't fail
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) return error(new Error("Division by zero"));
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */

/**
 * Discriminated union representing either success (`ok: true`) or failure (`ok: false`).
 *
 * @remarks
 * **Immutability**: Results are `Readonly` to prevent accidental mutation.
 *
 * **Type Narrowing**: TypeScript automatically narrows the type based on
 * the `ok` discriminant, providing type-safe access to `value` or `error`.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error (defaults to `Error`).
 *
 * @example
 * ```typescript
 * function handleResult(result: Result<string>) {
 *   if (result.ok) {
 *     // TypeScript knows result.value is string
 *     console.log(result.value.toUpperCase());
 *   } else {
 *     // TypeScript knows result.error is Error
 *     console.error(result.error.message);
 *   }
 * }
 * ```
 */
export type Result<T, E = Error> = Readonly<{ok: true; value: T} | {ok: false; error: E}>;

/**
 * Creates a successful Result containing the given value.
 *
 * @remarks
 * **Void Results**: When called without arguments, creates `Result<void>`
 * for operations that succeed without returning a value.
 *
 * **Type Inference**: TypeScript infers `T` from the provided value.
 *
 * @template T - The type of the success value (inferred from argument).
 * @param value - The success value to wrap. Optional for void results.
 * @returns A frozen Result object with `ok: true` and the wrapped value.
 *
 * @example
 * ```typescript
 * // With value
 * const success = ok(42);
 * // success.ok === true, success.value === 42
 *
 * // Without value (void result)
 * const voidSuccess = ok();
 * // voidSuccess.ok === true, voidSuccess.value === undefined
 * ```
 *
 * @see {@link error} for creating failure results
 * @see {@link Result} for the discriminated union type
 */
export const ok = <T>(value?: T): Readonly<Result<T>> => ({ok: true, value: value as T});

/**
 * Creates a failure Result containing the given error.
 *
 * @remarks
 * **Error Types**: While `E` defaults to `Error`, you can use custom
 * error types for domain-specific error handling.
 *
 * **Type Safety**: Returns `Result<never, E>` so it can be assigned to
 * any `Result<T, E>` regardless of `T`.
 *
 * @template E - The type of the error (defaults to `Error`).
 * @param error_ - The error value to wrap. Typically an `Error` instance
 *   but can be any type matching `E`.
 * @returns A frozen Result object with `ok: false` and the wrapped error.
 *
 * @example
 * ```typescript
 * // Standard Error
 * const failure = error(new Error("Something went wrong"));
 * // failure.ok === false, failure.error.message === "Something went wrong"
 *
 * // Custom error type
 * type ValidationError = { field: string; message: string };
 * const validationFailure = error<ValidationError>({ field: "email", message: "Invalid" });
 * ```
 *
 * @see {@link ok} for creating success results
 * @see {@link Result} for the discriminated union type
 */
export const error = <E = Error>(error_: E): Readonly<Result<never, E>> => ({ok: false, error: error_});
