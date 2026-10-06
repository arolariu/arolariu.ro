/**
 * @fileoverview effect/cli `status` subcommand running the Effect status program.
 * @module scripts/commands/status/cli
 *
 * @remarks
 * The command has no input: the global `--json` selects the presentation. In JSON mode the
 * {@link StatusDocument} is the single JSON document; otherwise the human dashboard (with the Node
 * version label) is rendered. Doctor runs with the live {@link NetworkProbeLive} (quick mode never
 * uses it). Every completion exits `0`: doctor's passing or failing checks are health data, the
 * legacy status completion rule.
 */

import {Effect} from "effect";
import {Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {runDoctor} from "../doctor/index.ts";
import {NetworkProbeLive} from "../doctor/NetworkProbe.ts";
import {JsonFlag, withCommandOutput} from "../flags.ts";
import {collectStatusDashboardWith, collectStatusWith, renderDashboard, type StatusDocument, type StatusDoctor} from "./index.ts";

/**
 * Builds the `status` subcommand.
 *
 * @param doctor - The composed doctor program; defaults to {@link runDoctor}. Tests pass a fake.
 * @returns The `status` subcommand.
 */
export function makeStatusCommand(doctor: StatusDoctor = runDoctor): CliSubcommand {
  return Command.make("status", {}, () =>
    Effect.gen(function* () {
      if (yield* JsonFlag) {
        const document = yield* collectStatusWith(doctor);
        yield* Effect.orDie((yield* Presenter).json(toJsonValue(document)));
        return;
      }
      const {document, nodeMajor} = yield* collectStatusDashboardWith(doctor);
      yield* renderDashboard(document, nodeMajor);
    }).pipe(Effect.provide(NetworkProbeLive), withCommandOutput("status")),
  ).pipe(Command.withDescription("Collects and renders monorepo health, workspace, git, security, and disk data."));
}
