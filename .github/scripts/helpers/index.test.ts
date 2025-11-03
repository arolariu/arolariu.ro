/**
 * @fileoverview Unit tests for helpers index (barrel exports)
 */

import {beforeAll, describe, expect, it} from "vitest";

describe("Helpers Index", () => {
  beforeAll(() => {
    // Set up required GitHub environment variables for tests
    process.env["GITHUB_REPOSITORY"] = "test-owner/test-repo";
  });
  describe("default exports", () => {
    it("should export cache helper", async () => {
      const {cache} = await import("./index");
      expect(cache).toBeDefined();
      expect(cache.generateKey).toBeDefined();
    });

    it("should export environment helper", async () => {
      const {env} = await import("./index");
      expect(env).toBeDefined();
      expect(env.get).toBeDefined();
    });

    it("should export filesystem helper", async () => {
      const {fs} = await import("./index");
      expect(fs).toBeDefined();
      expect(fs.exists).toBeDefined();
    });

    it("should export git helper", async () => {
      const {git} = await import("./index");
      expect(git).toBeDefined();
      expect(git.fetchBranch).toBeDefined();
    });

    it("should export http helper", async () => {
      const {http} = await import("./index");
      expect(http).toBeDefined();
      expect(http.get).toBeDefined();
    });

    it("should export artifacts helper", async () => {
      const {artifacts} = await import("./index");
      expect(artifacts).toBeDefined();
      expect(artifacts.upload).toBeDefined();
    });
  });

  describe("Helpers factory", () => {
    it("should create environment helper", async () => {
      const {Helpers} = await import("./index");
      const envHelper = await Helpers.createEnvironment();
      expect(envHelper).toBeDefined();
      expect(envHelper.get).toBeDefined();
    });

    it("should create filesystem helper", async () => {
      const {Helpers} = await import("./index");
      const fsHelper = await Helpers.createFileSystem();
      expect(fsHelper).toBeDefined();
      expect(fsHelper.exists).toBeDefined();
    });

    it("should create git helper", async () => {
      const {Helpers} = await import("./index");
      const gitHelper = await Helpers.createGit();
      expect(gitHelper).toBeDefined();
      expect(gitHelper.fetchBranch).toBeDefined();
    });

    it("should create github helper with token", async () => {
      const {Helpers} = await import("./index");
      const ghHelper = await Helpers.createGitHub("fake-token");
      expect(ghHelper).toBeDefined();
      expect(ghHelper.getPullRequest).toBeDefined();
    });

    it("should create artifacts helper", async () => {
      const {Helpers} = await import("./index");
      const artifactsHelper = await Helpers.createArtifacts();
      expect(artifactsHelper).toBeDefined();
      expect(artifactsHelper.upload).toBeDefined();
    });

    it("should create cache helper", async () => {
      const {Helpers} = await import("./index");
      const cacheHelper = await Helpers.createCache();
      expect(cacheHelper).toBeDefined();
      expect(cacheHelper.generateKey).toBeDefined();
    });

    it("should create comment builder", async () => {
      const {Helpers} = await import("./index");
      const commentBuilder = await Helpers.createCommentBuilder();
      expect(commentBuilder).toBeDefined();
      expect(commentBuilder.build).toBeDefined();
    });

    it("should create http helper", async () => {
      const {Helpers} = await import("./index");
      const httpHelper = await Helpers.createHttp();
      expect(httpHelper).toBeDefined();
      expect(httpHelper.get).toBeDefined();
    });

    it("should create http helper with custom user agent", async () => {
      const {Helpers} = await import("./index");
      const httpHelper = await Helpers.createHttp("custom-agent/1.0");
      expect(httpHelper).toBeDefined();
      expect(httpHelper.get).toBeDefined();
    });
  });

  describe("Utils exports", () => {
    it("should export Markdown utilities", async () => {
      const {Utils} = await import("./index");
      const MarkdownUtils = await Utils.Markdown();
      expect(MarkdownUtils).toBeDefined();
    });

    it("should export CacheConfigs", async () => {
      const {Utils} = await import("./index");
      const CacheConfigs = await Utils.CacheConfigs();
      expect(CacheConfigs).toBeDefined();
      expect(CacheConfigs.npm).toBeDefined();
    });
  });

  describe("factory function exports", () => {
    it("should export createEnvironmentHelper", async () => {
      const {createEnvironmentHelper} = await import("./index");
      expect(createEnvironmentHelper).toBeDefined();
      const helper = createEnvironmentHelper();
      expect(helper.get).toBeDefined();
    });

    it("should export createFileSystemHelper", async () => {
      const {createFileSystemHelper} = await import("./index");
      expect(createFileSystemHelper).toBeDefined();
      const helper = createFileSystemHelper();
      expect(helper.exists).toBeDefined();
    });

    it("should export createGitHelper", async () => {
      const {createGitHelper} = await import("./index");
      expect(createGitHelper).toBeDefined();
      const helper = createGitHelper();
      expect(helper.fetchBranch).toBeDefined();
    });

    it("should export createGitHubHelper", async () => {
      const {createGitHubHelper} = await import("./index");
      expect(createGitHubHelper).toBeDefined();
      const helper = createGitHubHelper("test-token");
      expect(helper.getPullRequest).toBeDefined();
    });

    it("should export createCacheHelper", async () => {
      const {createCacheHelper} = await import("./index");
      expect(createCacheHelper).toBeDefined();
      const helper = createCacheHelper();
      expect(helper.generateKey).toBeDefined();
    });

    it("should export createCommentBuilder", async () => {
      const {createCommentBuilder} = await import("./index");
      expect(createCommentBuilder).toBeDefined();
      const builder = createCommentBuilder();
      expect(builder.build).toBeDefined();
    });

    it("should export createHttpHelper", async () => {
      const {createHttpHelper} = await import("./index");
      expect(createHttpHelper).toBeDefined();
      const helper = createHttpHelper();
      expect(helper.get).toBeDefined();
    });

    it("should export createArtifactHelper", async () => {
      const {createArtifactHelper} = await import("./index");
      expect(createArtifactHelper).toBeDefined();
      const helper = createArtifactHelper();
      expect(helper.upload).toBeDefined();
    });
  });
});
