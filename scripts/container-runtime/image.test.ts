/**
 * @fileoverview Tests for local image build/run helpers.
 * @module scripts/container-runtime/image.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunner} from "../common/process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, runImageCli} from "./image.ts";
import {buildArtifactGenerationCommand} from "./preflight.ts";

describe("buildImageBuildCommand", () => {
  it("builds frontend image with Podman", () => {
    const command = buildImageBuildCommand(getContainerAdapter("podman"), {
      dockerfile: "infra/containers/Dockerfile.frontend",
      tag: "arolariu-frontend",
      context: ".",
      buildArgs: {VERSION: "local"},
    });

    expect(command).toEqual({
      command: "podman",
      args: ["build", "-f", "infra/containers/Dockerfile.frontend", "-t", "arolariu-frontend", "--build-arg", "VERSION=local", "."],
    });
  });

  describe("taxonomy artifact generation", () => {
    it("uses the current Node executable and unified artifact alias", () => {
      expect(buildArtifactGenerationCommand()).toEqual({
        command: process.execPath,
        args: [expect.stringMatching(/scripts[\\/]generate\.ts$/u), "/a"],
      });
    });

  });
});

describe("buildImageRunCommand", () => {
  it("runs backend image with Rancher", () => {
    const command = buildImageRunCommand(getContainerAdapter("rancher"), {
      tag: "arolariu-backend",
      ports: ["5000:8080"],
      environment: {INFRA: "local"},
    });

    expect(command).toEqual({
      command: "docker",
      args: ["run", "--rm", "-p", "5000:8080", "-e", "INFRA=local", "arolariu-backend"],
    });
  });

  describe("runImageCli", () => {
    it.each([
      ["frontend", true],
      ["backend", true],
      ["cv", false],
      ["exp", false],
    ] as const)("gates artifact generation for %s builds", async (target, shouldGenerate) => {
      const commands: Array<Readonly<{command: string; args: readonly string[]}>> = [];
      const runner: CommandRunner = {
        run: async (command) => {
          commands.push(command);
          return {code: 0, stdout: "podman version 5.8.2 podman-compose version 1.5.0", stderr: "", durationMs: 0, timedOut: false};
        },
      };

      await runImageCli(["build", "--target", target, "--engine", "podman"], {runner});

      expect(commands.some((command) => command.command === process.execPath && command.args.includes("/a"))).toBe(shouldGenerate);
    });

    it("reports a clean target error when --target is missing", async () => {
      const runner: CommandRunner = {
        run: async () => ({code: 0, stdout: "podman version 5.8.2\npodman-compose version 1.5.0", stderr: "", durationMs: 0, timedOut: false}),
      };

      await expect(runImageCli(["build", "--engine", "podman"], {runner})).rejects.toThrow("Use --target frontend|backend|cv|exp");
    });

    it("reports a clean action error when build/run is missing", async () => {
      const runner: CommandRunner = {
        run: async () => ({code: 0, stdout: "podman version 5.8.2\npodman-compose version 1.5.0", stderr: "", durationMs: 0, timedOut: false}),
      };

      await expect(runImageCli(["--target", "backend", "--engine", "podman"], {runner})).rejects.toThrow(
        "Use build or run as the first argument.",
      );
    });

    it.each(["--help", "-h", "/h"])("routes %s through the injected logger without executing anything", async (helpFlag) => {
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
      let executed = false;
      const runner: CommandRunner = {
        run: async () => {
          executed = true;
          return {code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false};
        },
      };

      await expect(runImageCli([helpFlag], {runner, logger})).resolves.toBeUndefined();

      expect(executed).toBe(false);
      expect(sink.records.some((record) => record.text.includes("Usage:"))).toBe(true);
    });
  });
});
