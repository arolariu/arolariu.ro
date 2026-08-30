/**
 * @fileoverview Terminal-backed prompt contracts for setup workflows.
 * @module scripts.common.prompts
 */

import {createInterface} from "node:readline";
import {StringDecoder} from "node:string_decoder";
import type {MonorepositoryLogger} from "./logger.ts";

/** One selectable prompt value and its human-readable label. */
export interface PromptChoice<TValue extends string> {
  /** Value returned when this choice is selected. */
  readonly value: TValue;
  /** Human-readable choice label. */
  readonly label: string;
}

/** Interactive prompt operations used by setup phases. */
export interface PromptProvider {
  /** Requests a yes/no decision. */
  readonly confirm: (message: string, defaultValue?: boolean) => Promise<boolean>;
  /** Requests one value from a fixed set of choices. */
  readonly select: <TValue extends string>(
    message: string,
    choices: readonly PromptChoice<TValue>[],
    defaultValue?: TValue,
  ) => Promise<TValue>;
  /** Requests visible free-form text. */
  readonly text: (message: string) => Promise<string>;
  /** Requests secret text without echoing typed characters. */
  readonly secret: (message: string) => Promise<string>;
}

/** Terminal streams and raw-mode control injected into the prompt provider. */
export interface PromptTerminal {
  /** Stream from which prompt input is read. */
  readonly input: NodeJS.ReadableStream;
  /** Stream to which prompt presentation is written. */
  readonly output: NodeJS.WritableStream;
  /** Whether input is attached to an interactive terminal. */
  readonly isTTY: boolean;
  /** Optional raw-mode switch required for non-echoing secret input. */
  readonly setRawMode?: (mode: boolean) => void;
}

interface ParsedAnswer<TValue> {
  readonly valid: boolean;
  readonly value?: TValue;
  readonly error?: string;
}

function cancellationError(): Error {
  const error = new Error("Prompt cancelled by user.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function nonInteractiveError(kind: string): Error {
  return new Error(`Cannot request ${kind} without an interactive terminal. Re-run setup in a TTY.`);
}

function createProcessTerminal(): PromptTerminal {
  return {
    input: process.stdin,
    output: process.stdout,
    isTTY: process.stdin.isTTY === true,
    ...(typeof process.stdin.setRawMode === "function"
      ? {
          setRawMode: (mode: boolean): void => {
            process.stdin.setRawMode(mode);
          },
        }
      : {}),
  };
}

function askValidated<TValue>(terminal: PromptTerminal, message: string, parse: (answer: string) => ParsedAnswer<TValue>): Promise<TValue> {
  return new Promise<TValue>((resolve, reject) => {
    const readline = createInterface({
      input: terminal.input,
      output: terminal.output,
      terminal: terminal.isTTY,
    });
    let settled = false;

    const settle = (result: Readonly<{value: TValue}> | Readonly<{error: unknown}>): void => {
      if (settled) {
        return;
      }
      settled = true;
      readline.close();
      if ("error" in result) {
        reject(result.error);
      } else {
        resolve(result.value);
      }
    };

    const ask = (): void => {
      readline.question(message, (answer) => {
        const parsed = parse(answer);
        if (parsed.valid && parsed.value !== undefined) {
          settle({value: parsed.value});
          return;
        }
        terminal.output.write(`${parsed.error ?? "Invalid response."}\n`);
        ask();
      });
    };

    readline.once("SIGINT", () => settle({error: cancellationError()}));
    readline.once("close", () => {
      if (!settled) {
        settle({error: new Error("Prompt input ended before a response was submitted.")});
      }
    });

    ask();
  });
}

function readSecret(terminal: PromptTerminal, message: string): Promise<string> {
  if (!terminal.isTTY) {
    return Promise.reject(nonInteractiveError("a secret"));
  }
  if (terminal.setRawMode === undefined) {
    return Promise.reject(new Error("Cannot request a secret because this terminal does not support raw mode."));
  }
  const setRawMode = terminal.setRawMode;

  return new Promise<string>((resolve, reject) => {
    const decoder = new StringDecoder("utf8");
    const characters: string[] = [];
    let settled = false;
    let rawModeEnabled = false;

    const cleanup = (): unknown[] => {
      const errors: unknown[] = [];
      const attempt = (operation: () => void): void => {
        try {
          operation();
        } catch (error: unknown) {
          errors.push(error);
        }
      };

      attempt(() => terminal.input.removeListener("data", onData));
      attempt(() => terminal.input.removeListener("end", onEnd));
      attempt(() => terminal.input.removeListener("error", onError));
      attempt(() => terminal.input.removeListener("close", onClose));
      if (rawModeEnabled) {
        rawModeEnabled = false;
        attempt(() => setRawMode(false));
      }
      return errors;
    };

    const settle = (result: Readonly<{value: string}> | Readonly<{error: unknown}>): void => {
      if (settled) {
        return;
      }
      settled = true;
      const finalizationErrors = cleanup();
      try {
        terminal.output.write("\n");
      } catch (error: unknown) {
        finalizationErrors.push(error);
      }

      if ("error" in result) {
        if (finalizationErrors.length > 0) {
          const aggregate = new AggregateError([result.error, ...finalizationErrors], "Secret prompt failed during terminal finalization.");
          if (isAbortError(result.error)) {
            // Preserve interruption classification: a concurrent finalization
            // failure must not downgrade a cancelled prompt into an ordinary
            // error that the orchestrator would treat as a phase failure.
            aggregate.name = "AbortError";
          }
          reject(aggregate);
          return;
        }
        reject(result.error);
        return;
      }
      if (finalizationErrors.length > 0) {
        reject(
          finalizationErrors.length === 1
            ? finalizationErrors[0]
            : new AggregateError(finalizationErrors, "Secret prompt terminal finalization failed."),
        );
        return;
      }
      resolve(result.value);
    };

    const consume = (text: string): void => {
      for (const character of text) {
        if (character === "\u0003") {
          settle({error: cancellationError()});
          return;
        }
        if (character === "\r" || character === "\n") {
          settle({value: characters.join("")});
          return;
        }
        if (character === "\b" || character === "\u007f") {
          characters.pop();
          continue;
        }
        characters.push(character);
      }
    };

    function onData(chunk: unknown): void {
      if (typeof chunk === "string") {
        consume(chunk);
        return;
      }
      if (chunk instanceof Uint8Array) {
        consume(decoder.write(chunk));
        return;
      }
      consume(String(chunk));
    }

    function onEnd(): void {
      settle({error: new Error("Secret prompt input ended before a value was submitted.")});
    }

    function onError(error: unknown): void {
      settle({error});
    }

    function onClose(): void {
      settle({error: new Error("Secret prompt input closed before a value was submitted.")});
    }

    try {
      setRawMode(true);
      rawModeEnabled = true;
      terminal.input.on("data", onData);
      terminal.input.once("end", onEnd);
      terminal.input.once("error", onError);
      terminal.input.once("close", onClose);
      terminal.output.write(`${message}: `);
    } catch (error: unknown) {
      settle({error});
    }
  });
}

/**
 * Creates prompt operations over injected or process terminal streams.
 *
 * @param logger - Active setup logger. Secret values are never passed to it.
 * @param terminal - Optional terminal streams and raw-mode control.
 * @returns Prompt provider suitable for setup orchestration.
 */
export function createTerminalPromptProvider(
  logger: MonorepositoryLogger,
  terminal: PromptTerminal = createProcessTerminal(),
): PromptProvider {
  void logger;

  return {
    confirm: async (message, defaultValue) => {
      if (!terminal.isTTY) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw nonInteractiveError("confirmation");
      }

      const suffix = defaultValue === undefined ? "[y/n]" : defaultValue ? "[Y/n]" : "[y/N]";
      return askValidated(terminal, `${message} ${suffix} `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        if (normalized === "" && defaultValue !== undefined) {
          return {valid: true, value: defaultValue};
        }
        if (normalized === "y" || normalized === "yes") {
          return {valid: true, value: true};
        }
        if (normalized === "n" || normalized === "no") {
          return {valid: true, value: false};
        }
        return {valid: false, error: "Enter yes or no."};
      });
    },
    select: async <TValue extends string>(
      message: string,
      choices: readonly PromptChoice<TValue>[],
      defaultValue?: TValue,
    ): Promise<TValue> => {
      if (choices.length === 0) {
        throw new Error("A select prompt requires at least one choice.");
      }
      if (!terminal.isTTY) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw nonInteractiveError("a selection");
      }

      terminal.output.write(`${message}\n`);
      choices.forEach((choice, index) => terminal.output.write(`  ${index + 1}. ${choice.label}\n`));
      return askValidated(terminal, "Selection: ", (answer) => {
        const normalized = answer.trim();
        if (normalized === "" && defaultValue !== undefined) {
          return {valid: true, value: defaultValue};
        }

        const choiceByValue = choices.find((choice) => choice.value === normalized);
        if (choiceByValue !== undefined) {
          return {valid: true, value: choiceByValue.value};
        }

        const selectedIndex = Number.parseInt(normalized, 10);
        if (/^[1-9]\d*$/.test(normalized)) {
          const choiceByIndex = choices[selectedIndex - 1];
          if (choiceByIndex !== undefined) {
            return {valid: true, value: choiceByIndex.value};
          }
        }

        return {valid: false, error: `Invalid selection. Choose 1-${choices.length}.`};
      });
    },
    text: async (message) => {
      if (!terminal.isTTY) {
        throw nonInteractiveError("text input");
      }
      return askValidated(terminal, `${message}: `, (answer) => ({valid: true, value: answer}));
    },
    secret: (message) => readSecret(terminal, message),
  };
}
