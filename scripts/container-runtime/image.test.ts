/**
 * @fileoverview Tests for local image build/run helpers.
 * @module scripts/container-runtime/image.test
 */

import {describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, runImageCli} from "./image.ts";
import {buildArtifactGenerationCommand} from "./preflight.ts";
import type {CommandRunner} from "./process.ts";

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
      const originalArgv = process.argv;
      process.argv = ["node", "image.ts", "build", "--target", target, "--engine", "podman"];
      const commands: Array<Readonly<{command: string; args: readonly string[]}>> = [];
      const runner: CommandRunner = {
        run: async (command) => {
          commands.push(command);
          return {code: 0, output: "podman version 5.8.2 podman-compose version 1.5.0"};
        },
      };

      try {
        await runImageCli(runner);
      } finally {
        process.argv = originalArgv;
      }

      expect(commands.some((command) => command.command === process.execPath && command.args.includes("/a"))).toBe(shouldGenerate);
    });

    it("reports a clean target error when --target is missing", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "image.ts", "build", "--engine", "podman"];
      const runner: CommandRunner = {
        run: async () => ({code: 0, output: "podman version 5.8.2\npodman-compose version 1.5.0"}),
      };

      try {
        await expect(runImageCli(runner)).rejects.toThrow("Use --target frontend|backend|cv|exp");
      } finally {
        process.argv = originalArgv;
      }
    });
  });
});
