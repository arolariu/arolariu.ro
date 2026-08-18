/**
 * @fileoverview Semantic logging contracts for monorepository scripts.
 * @module scripts.common.logger
 */

import {styleText} from "node:util";

/**
 * Defines semantic logging levels used by monorepository automation.
 *
 * @remarks
 * Implementations decide how messages are transported and presented. Callers
 * select a semantic level and provide a concise, already contextualized message.
 */
export abstract class MonorepositoryLogger {
  /**
   * Writes diagnostic detail useful while troubleshooting.
   *
   * @param message - Diagnostic message to write.
   */
  public abstract debug(message: string): void;

  /**
   * Writes normal lifecycle information.
   *
   * @param message - Informational message to write.
   */
  public abstract info(message: string): void;

  /**
   * Writes a recoverable or intentionally deferred condition.
   *
   * @param message - Warning message to write.
   */
  public abstract warn(message: string): void;

  /**
   * Writes a failed operation before its error propagates.
   *
   * @param message - Error message to write.
   */
  public abstract error(message: string): void;

  /**
   * Writes successful lifecycle completion.
   *
   * @param message - Success message to write.
   */
  public abstract success(message: string): void;
}

/**
 * Writes styled semantic log messages to the process console.
 *
 * @remarks
 * Every message includes a stable `[arolariu::<context>]` prefix, a
 * level-specific icon, and a color selected through Node.js `styleText`.
 *
 * @example
 * ```typescript
 * const logger = new MonorepositoryConsoleLogger("generate::artifacts");
 * logger.info("Starting artifact generation.");
 * logger.success("Artifact generation completed.");
 * ```
 */
export class MonorepositoryConsoleLogger extends MonorepositoryLogger {
  /** Logical script context included in every log prefix. */
  readonly #context: string;

  /**
   * Creates a styled console logger.
   *
   * @param context - Logical context appended to the `arolariu` prefix.
   */
  public constructor(context: string) {
    super();
    this.#context = context;
  }

  /** {@inheritDoc MonorepositoryLogger.debug} */
  public override debug(message: string): void {
    console.debug(styleText("gray", this.format("🐛", message)));
  }

  /** {@inheritDoc MonorepositoryLogger.info} */
  public override info(message: string): void {
    console.info(styleText("cyan", this.format("ℹ️", message)));
  }

  /** {@inheritDoc MonorepositoryLogger.warn} */
  public override warn(message: string): void {
    console.warn(styleText("yellow", this.format("⚠️", message)));
  }

  /** {@inheritDoc MonorepositoryLogger.error} */
  public override error(message: string): void {
    console.error(styleText("red", this.format("⛔", message)));
  }

  /** {@inheritDoc MonorepositoryLogger.success} */
  public override success(message: string): void {
    console.info(styleText("green", this.format("✅", message)));
  }

  /**
   * Builds the stable prefix and semantic message body.
   *
   * @param icon - Level-specific icon.
   * @param message - Message supplied by the caller.
   * @returns Formatted unstyled log line.
   */
  private format(icon: string, message: string): string {
    return `[arolariu::${this.#context}] ${icon} ${message}`;
  }
}
