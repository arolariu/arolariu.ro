/**
 * @fileoverview Tests for local image build/run helpers.
 * @module scripts/container-runtime/image.test
 */

import {describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, requiresTaxonomyArtifacts, runImageCli} from "./image.ts";
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

  describe("requiresTaxonomyArtifacts", () => {
    it.each([
      ["frontend", true],
      ["backend", true],
      ["cv", false],
      ["exp", false],
    ] as const)("returns %s for %s", (target, expected) => {
      expect(requiresTaxonomyArtifacts(target)).toBe(expected);
    });
  });

  describe("runImageCli", () => {
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

    it("generates taxonomy artifacts before building the frontend image", async () => {
      const originalArgv = process.argv;
      process.argv = ["node", "image.ts", "build", "--engine", "podman", "--target", "frontend"];
      const commands: string[] = [];
      const runner: CommandRunner = {
        run: async (command) => {
          commands.push([command.command, ...command.args].join(" "));
          return {code: 0, output: "podman version 5.8.2\npodman-compose version 1.5.0"};
        },
      };

      try {
        await runImageCli(runner);
        const generationCommand = commands.find((command) => command.includes("generate.artifacts.ts"));
        expect(generationCommand).toBeDefined();
        expect(generationCommand).not.toContain("npm run");
        expect(commands.indexOf(generationCommand ?? "")).toBeLessThan(commands.findIndex((command) => command.startsWith("podman build")));
      } finally {
        process.argv = originalArgv;
      }
    });
  });
});
