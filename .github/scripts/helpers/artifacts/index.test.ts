/**
 * @fileoverview Artifact conveniences using real discovery and typed SDK boundaries.
 * @module github/scripts/helpers/artifacts/tests
 */
import {mkdtemp, mkdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {DefaultArtifactClient} from "../sdk/artifact.ts";
import {createArtifactHelper, type IArtifactHelper} from "./index.ts";

describe("ArtifactHelper", () => {
  let directory: string;
  let file: string;
  let helper: IArtifactHelper;
  let client: DefaultArtifactClient;
  const findBy = {token: "opaque", workflowRunId: 42, repositoryOwner: "owner", repositoryName: "repo"};

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "artifact-test-"));
    file = join(directory, "report.txt");
    await writeFile(file, "actual evidence");
    vi.spyOn(DefaultArtifactClient.prototype, "uploadArtifact").mockResolvedValue({id: 123, size: 1024, digest: "actual-digest"});
    vi.spyOn(DefaultArtifactClient.prototype, "downloadArtifact").mockResolvedValue({downloadPath: directory, digestMismatch: false});
    vi.spyOn(DefaultArtifactClient.prototype, "getArtifact").mockResolvedValue({artifact: {id: 123, name: "report", size: 1024}});
    vi.spyOn(DefaultArtifactClient.prototype, "listArtifacts").mockResolvedValue({artifacts: []});
    client = new DefaultArtifactClient();
    helper = createArtifactHelper(client);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, {recursive: true, force: true});
  });

  it("discovers real files and retains upload digest, size, and identity", async () => {
    const result = await helper.upload({name: "report", files: [join(directory, "*.txt")], rootDirectory: directory});
    expect(result).toEqual({id: 123, size: 1024, digest: "actual-digest", fileCount: 1});
    expect(client.uploadArtifact).toHaveBeenCalledWith("report", [file], directory, {});
  });

  it.each([undefined, 0, -1])("rejects missing or nonpositive upload identity %s", async (id) => {
    vi.mocked(client.uploadArtifact).mockResolvedValue(id === undefined ? {} : {id});
    await expect(helper.upload({name: "report", files: [file], rootDirectory: directory})).rejects.toThrow(/identity|id/i);
  });

  it("does not invent absent native size metadata", async () => {
    vi.mocked(client.uploadArtifact).mockResolvedValue({id: 123});
    expect(await helper.upload({name: "report", files: [file]})).toEqual({id: 123, fileCount: 1});
  });

  it("forwards native compression, skip-archive, and zero retention", async () => {
    await helper.upload({name: "report", files: [file], retentionDays: 0, nativeOptions: {compressionLevel: 0, skipArchive: true}});
    expect(client.uploadArtifact).toHaveBeenCalledWith("report", [file], expect.any(String), {
      retentionDays: 0,
      compressionLevel: 0,
      skipArchive: true,
    });
  });

  it("rejects conflicting retention settings before upload", async () => {
    await expect(helper.upload({name: "report", files: [file], retentionDays: 7, nativeOptions: {retentionDays: 30}})).rejects.toThrow(
      /conflict/i,
    );
    expect(client.uploadArtifact).not.toHaveBeenCalled();
  });

  it("rejects empty discovery without calling the external client", async () => {
    await expect(helper.upload({name: "report", files: [join(directory, "*.missing")]})).rejects.toThrow(
      "No files found matching patterns",
    );
    expect(client.uploadArtifact).not.toHaveBeenCalled();
  });

  it("uses the injected complete native client", async () => {
    const injected = new DefaultArtifactClient();
    const upload = vi.fn<typeof injected.uploadArtifact>().mockResolvedValue({id: 456});
    injected.uploadArtifact = upload;
    const owned = createArtifactHelper(injected);
    expect((await owned.upload({name: "report", files: [file]})).id).toBe(456);
    expect(upload).toHaveBeenCalledOnce();
  });

  it("preserves native upload errors", async () => {
    const failure = new Error("Upload failed");
    vi.mocked(client.uploadArtifact).mockRejectedValue(failure);
    await expect(helper.upload({name: "report", files: [file]})).rejects.toBe(failure);
  });

  it("forwards cross-run lookup and required download integrity options", async () => {
    const nativeOptions = {findBy, expectedHash: "expected-digest", skipDecompress: true};
    const result = await helper.download({name: "report", destination: directory, nativeOptions});
    expect(client.getArtifact).toHaveBeenCalledWith("report", {findBy});
    expect(client.downloadArtifact).toHaveBeenCalledWith(123, {...nativeOptions, path: directory});
    expect(result).toEqual({id: 123, downloadPath: directory, digestMismatch: false});
  });

  it("downloads by ID without a name lookup", async () => {
    expect((await helper.download({artifactId: 456, destination: directory})).id).toBe(456);
    expect(client.downloadArtifact).toHaveBeenCalledWith(456, {path: directory});
    expect(client.getArtifact).not.toHaveBeenCalled();
  });

  it("retains the requested destination when the native response omits it", async () => {
    vi.mocked(client.downloadArtifact).mockResolvedValue({});
    expect((await helper.download({artifactId: 123, destination: directory})).downloadPath).toBe(directory);
  });

  it("rejects download integrity mismatch rather than declaring success", async () => {
    vi.mocked(client.downloadArtifact).mockResolvedValue({downloadPath: directory, digestMismatch: true});
    await expect(helper.download({artifactId: 123, destination: directory, nativeOptions: {expectedHash: "expected"}})).rejects.toThrow(
      /digest/i,
    );
  });

  it("requires a name or ID", async () => {
    await expect(helper.download({destination: directory})).rejects.toThrow("Either 'name' or 'artifactId' must be provided");
  });

  it.each([0, -1, Number.NaN])("rejects invalid required download identity %s", async (artifactId) => {
    await expect(helper.download({artifactId, destination: directory})).rejects.toThrow(/id/i);
    expect(client.downloadArtifact).not.toHaveBeenCalled();
  });

  it.each(["downloadArtifact", "getArtifact", "listArtifacts"] as const)("preserves native %s errors", async (method) => {
    const failure = new Error("Native artifact error");
    vi.mocked(client[method]).mockRejectedValue(failure);
    const action = method === "listArtifacts" ? helper.list() : helper.download({name: "report", destination: directory});
    await expect(action).rejects.toBe(failure);
  });

  it("retains listing metadata and forwards list/find options", async () => {
    const artifact = {id: 123, name: "report", size: 1024, digest: "real-digest", createdAt: new Date("2026-01-01T00:00:00Z")};
    vi.mocked(client.listArtifacts).mockResolvedValue({artifacts: [artifact]});
    expect(await helper.list({latest: false, findBy})).toEqual([artifact]);
    expect(client.listArtifacts).toHaveBeenCalledWith({latest: false, findBy});
  });

  it("returns an empty native listing without fabrication", async () => {
    expect(await helper.list()).toEqual([]);
  });

  it("uploads a real directory recursively without counting directory entries", async () => {
    const nested = join(directory, "nested");
    await mkdir(nested);
    const second = join(nested, "second.txt");
    await writeFile(second, "second evidence");
    expect((await helper.uploadDirectory("report", directory, 7)).fileCount).toBe(2);
    expect(client.uploadArtifact).toHaveBeenCalledWith("report", expect.arrayContaining([file, second]), directory, {retentionDays: 7});
  });

  it("retains specific-file convenience options including zero retention", async () => {
    await helper.uploadFiles("report", [file], directory, 0);
    expect(client.uploadArtifact).toHaveBeenCalledWith("report", [file], directory, {retentionDays: 0});
  });
});
