import assert from "node:assert/strict";
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {afterEach, test} from "node:test";

import {diagnoseAssets} from "./diagnostics.mjs";
import {parseFrontmatter} from "./frontmatter.mjs";
import {inventoryAssets} from "./inventory.mjs";
import {repositoryPathKind} from "./path-safety.mjs";

const repositories = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) {
    rmSync(repository, {force: true, recursive: true});
  }
});

function write(root, path, content) {
  const target = join(root, ...path.split("/"));
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, content);
}

function createFixtureRepository({memory = {entities: [], relations: []}, promptName = "fix-bug", skillName = "fix-bug"} = {}) {
  const root = mkdtempSync(join(tmpdir(), "arolariu-checker-"));
  repositories.push(root);

  write(
    root,
    "AGENTS.md",
    [
      "# Repository",
      "npm run test:unit",
      "npm run build:website",
      "dotnet build sites/api.arolariu.ro/src/Core",
      "dotnet test sites/api.arolariu.ro/tests",
      "npm run build:components",
      "",
    ].join("\n"),
  );
  write(
    root,
    ".github/agents/backend-expert.agent.md",
    ["---", "name: Backend Expert", "description: Backend specialist", 'tools: ["read", "search"]', "---", ""].join("\n"),
  );
  write(
    root,
    ".github/instructions/typescript.instructions.md",
    ["---", "name: TypeScript", "description: Type rules", 'applyTo: "**/*.ts"', "---", ""].join("\n"),
  );
  write(
    root,
    ".github/prompts/fix-bug.prompt.md",
    [
      "---",
      `name: ${promptName}`,
      "description: Bug shortcut",
      'argument-hint: "[reproduction]"',
      "agent: agent",
      "---",
      "",
      "[skill](../skills/fix-bug/SKILL.md)",
      "",
    ].join("\n"),
  );
  write(root, ".github/skills/fix-bug/SKILL.md", ["---", `name: ${skillName}`, "description: Fix a defect", "---", ""].join("\n"));
  write(root, ".github/extensions/arolariu-context/extension.mjs", 'import {joinSession} from "@github/copilot-sdk/extension";\n');
  write(root, ".github/memory/memory.json", JSON.stringify(memory));
  write(root, ".github/mcp.json", '{"mcpServers":{}}\n');

  return root;
}

function createInvalidFixtureRepository() {
  const root = createFixtureRepository({skillName: "wrong-name"});

  write(
    root,
    ".github/agents/backend-expert.agent.md",
    [
      "---",
      "name: Backend Expert",
      "description: Backend specialist",
      "model: Claude Sonnet 4.5",
      "lastReviewed: 2026-05-08",
      "---",
      "",
    ].join("\n"),
  );
  write(
    root,
    ".github/extensions/arolariu-context/extension.mjs",
    [
      'import {execFile} from "node:child_process";',
      'import {approveAll} from "@github/copilot-sdk";',
      'execFile("powershell", []);',
      "",
    ].join("\n"),
  );

  return root;
}

test("parseFrontmatter extracts quoted top-level scalars", () => {
  assert.deepEqual(
    parseFrontmatter(["---", "name: 'Backend Expert'", 'description: "Backend"', 'tools: ["read", "search"]', "---", "Body"].join("\n")),
    {
      description: "Backend",
      name: "Backend Expert",
      tools: '["read", "search"]',
    },
  );
});

test("parseFrontmatter returns an empty object when metadata is absent", () => {
  assert.deepEqual(parseFrontmatter("# Body\n"), {});
});

test("inventoryAssets discovers every supported asset type", () => {
  const assets = inventoryAssets(createFixtureRepository());

  assert.deepEqual([...new Set(assets.map(({type}) => type))].sort(), [
    "agent",
    "client-config",
    "extension",
    "instruction",
    "memory",
    "prompt",
    "skill",
  ]);
});

test("inventoryAssets recursively discovers nested instructions", () => {
  const root = createFixtureRepository();
  write(
    root,
    ".github/instructions/nested/security.instructions.md",
    ["---", "name: Nested Security", "description: Nested instruction", 'applyTo: "**/*.security.json"', "---", ""].join("\n"),
  );

  const assets = inventoryAssets(root);

  assert.ok(assets.some(({path, type}) => type === "instruction" && path === ".github/instructions/nested/security.instructions.md"));
});

test("diagnoseAssets reports stale metadata and unsafe extension patterns", () => {
  const findings = diagnoseAssets(createInvalidFixtureRepository());

  assert.ok(findings.some(({code}) => code === "pinned-model"));
  assert.ok(findings.some(({code}) => code === "last-reviewed"));
  assert.ok(findings.some(({code}) => code === "approve-all"));
  assert.ok(findings.some(({code}) => code === "arbitrary-shell-handler"));
  assert.ok(findings.some(({code}) => code === "skill-name-mismatch"));
});

test("diagnoseAssets reports source-derived memory", () => {
  const findings = diagnoseAssets(
    createFixtureRepository({
      memory: {
        entities: [
          {
            name: "Repository",
            observations: ["Next.js 16.3.0"],
          },
        ],
        relations: [],
      },
    }),
  );

  assert.ok(findings.some(({code}) => code === "source-derived-memory"));
});

test("diagnoseAssets reports forbidden version metadata even when empty", () => {
  for (const version of ['"1.0.0"', '""', "0"]) {
    const root = createFixtureRepository();
    write(
      root,
      ".github/agents/backend-expert.agent.md",
      [
        "---",
        "name: Backend Expert",
        "description: Backend specialist",
        'tools: ["read", "search"]',
        `version: ${version}`,
        "---",
        "",
      ].join("\n"),
    );

    assert.ok(
      diagnoseAssets(root).some(({code, path}) => code === "version-metadata" && path === ".github/agents/backend-expert.agent.md"),
      `Must report version: ${version}`,
    );
  }
});

test("diagnoseAssets allows a prompt alias to share its skill name", () => {
  const findings = diagnoseAssets(
    createFixtureRepository({
      promptName: "fix-bug",
      skillName: "fix-bug",
    }),
  );

  assert.ok(!findings.some(({code}) => code === "duplicate-asset-name"));
});

test("diagnoseAssets accepts complete required metadata", () => {
  assert.deepEqual(diagnoseAssets(createFixtureRepository()), []);
});

test("diagnoseAssets accepts inline and block-style tools lists", () => {
  for (const tools of ['tools: ["read", "search"]', "tools:\n  - read\n  - search"]) {
    const root = createFixtureRepository();
    write(root, ".github/agents/backend-expert.agent.md", `---\nname: Backend Expert\ndescription: Backend specialist\n${tools}\n---\n`);

    assert.deepEqual(diagnoseAssets(root), [], tools);
  }
});

test("diagnoseAssets reports missing required metadata", () => {
  for (const [path, metadata, field] of [
    [".github/agents/backend-expert.agent.md", "name: '   '\ndescription: Backend specialist\ntools: []", "name"],
    [".github/agents/backend-expert.agent.md", "name: Backend Expert\ndescription: Backend specialist", "tools"],
    [".github/instructions/typescript.instructions.md", "name: TypeScript\ndescription: Type rules", "applyTo"],
    [".github/prompts/fix-bug.prompt.md", 'name: fix-bug\ndescription: Bug shortcut\nargument-hint: "[reproduction]"', "agent"],
    [".github/prompts/fix-bug.prompt.md", "name: fix-bug\ndescription: Bug shortcut\nagent: agent", "argument-hint"],
    [".github/skills/fix-bug/SKILL.md", "description: Fix a defect", "name"],
  ]) {
    const root = createFixtureRepository();
    write(root, path, `---\n${metadata}\n---\n`);

    assert.ok(
      diagnoseAssets(root).some(
        (finding) => finding.path === path && finding.code === "missing-metadata" && finding.message.includes(`'${field}'`),
      ),
      `${path} must report missing ${field}`,
    );
  }
});

test("diagnoseAssets reports malformed MCP JSON", () => {
  const root = createFixtureRepository();
  write(root, ".github/mcp.json", "{invalid json");

  assert.ok(diagnoseAssets(root).some(({code, path}) => code === "invalid-json" && path === ".github/mcp.json"));
});

test("diagnoseAssets rejects invalid MCP server maps", () => {
  for (const configuration of [null, [], {mcpServers: null}, {mcpServers: []}, {mcpServers: {example: "not a server object"}}]) {
    const root = createFixtureRepository();
    write(root, ".github/mcp.json", JSON.stringify(configuration));

    assert.ok(
      diagnoseAssets(root).some(({code, path}) => code === "invalid-mcp-config" && path === ".github/mcp.json"),
      `Must reject ${JSON.stringify(configuration)}`,
    );
  }
});

test("diagnoseAssets accepts wrapped and bare MCP server maps", () => {
  for (const configuration of [
    {},
    {mcpServers: {}},
    {mcpServers: {example: {type: "stdio", command: "node"}}},
    {example: {type: "http", url: "https://example.invalid/mcp"}},
  ]) {
    const root = createFixtureRepository();
    write(root, ".github/mcp.json", JSON.stringify(configuration));

    assert.deepEqual(diagnoseAssets(root), []);
  }
});

test("diagnoseAssets reports metadata, scope, link, duplicate, and command drift", () => {
  const root = createFixtureRepository();
  write(root, ".github/skills/duplicate/SKILL.md", ["---", "name: fix-bug", "description: Duplicate", "---", ""].join("\n"));
  write(
    root,
    ".github/instructions/review.instructions.md",
    ["---", "name: Review", 'applyTo: "**"', "---", "", "[missing](./missing.md)", ""].join("\n"),
  );
  write(
    root,
    ".github/prompts/stale.prompt.md",
    ["---", "name: stale", "description: Stale", "---", "", "npm run test:website", ""].join("\n"),
  );

  const findings = diagnoseAssets(root);

  assert.ok(findings.some(({code}) => code === "missing-description"));
  assert.ok(findings.some(({code}) => code === "duplicate-asset-name"));
  assert.ok(findings.some(({code}) => code === "global-review-instruction"));
  assert.ok(findings.some(({code}) => code === "broken-relative-link"));
  assert.ok(findings.some(({code}) => code === "stale-command"));
});

test("diagnoseAssets rejects unsafe link targets before filesystem access", () => {
  const root = createFixtureRepository();
  write(
    root,
    ".github/docs/unsafe-links.md",
    [
      "[scheme-relative](//invalid.example/share/file.md)",
      "[unc](\\\\invalid.example\\share\\file.md)",
      "[absolute](C:\\outside\\file.md)",
      "[escape](../../../outside.md)",
      "",
    ].join("\n"),
  );

  const findings = diagnoseAssets(root).filter(({code}) => code === "unsafe-relative-link");

  assert.equal(findings.length, 4);
});

test("diagnoseAssets checks instruction catalogs and skill resources", () => {
  const root = createFixtureRepository();
  write(root, ".github/instructions/references/typescript.md", "[missing catalog link](./missing-catalog.md)\n");
  write(root, ".github/skills/fix-bug/references/troubleshooting.md", "[missing resource link](./missing-resource.md)\n");

  const findings = diagnoseAssets(root).filter(({code}) => code === "broken-relative-link");

  assert.ok(findings.some(({path}) => path === ".github/instructions/references/typescript.md"));
  assert.ok(findings.some(({path}) => path === ".github/skills/fix-bug/references/troubleshooting.md"));
});

test("diagnoseAssets ignores example links inside fenced code", () => {
  const root = createFixtureRepository();
  write(root, ".github/instructions/references/examples.md", ["```markdown", "[example](./not-a-document-link.md)", "```", ""].join("\n"));

  const findings = diagnoseAssets(root);

  assert.ok(!findings.some(({code, path}) => code === "broken-relative-link" && path === ".github/instructions/references/examples.md"));
});

test("diagnoseAssets scans governed AGENTS files and non-inline links", () => {
  const root = createFixtureRepository();
  write(
    root,
    "sites/example/AGENTS.md",
    [
      "[reference link][missing-reference]",
      "[missing-reference]: ./missing-reference.md",
      '<a href="./missing-html.md">Missing HTML link</a>',
      "",
    ].join("\n"),
  );

  const findings = diagnoseAssets(root).filter(({code, path}) => code === "broken-relative-link" && path === "sites/example/AGENTS.md");

  assert.equal(findings.length, 2);
});

test("diagnoseAssets rejects unsafe reference and HTML link targets", () => {
  const root = createFixtureRepository();
  write(
    root,
    ".github/instructions/references/security.md",
    [
      "[reference][unsafe]",
      "[unsafe]: //invalid.example/share/file.md",
      '<a href="file://invalid.example/share/file.md">Unsafe HTML</a>',
      "",
    ].join("\n"),
  );

  const findings = diagnoseAssets(root).filter(({code}) => code === "unsafe-relative-link");

  assert.equal(findings.length, 2);
});

test("diagnoseAssets rejects repository-relative links through symlinks", () => {
  const root = createFixtureRepository();
  const outside = mkdtempSync(join(tmpdir(), "arolariu-checker-outside-"));
  repositories.push(outside);
  writeFileSync(join(outside, "outside.md"), "outside\n");

  const link = join(root, ".github", "docs", "escape");
  mkdirSync(dirname(link), {recursive: true});
  symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  write(root, ".github/docs/symlink-link.md", "[escape](./escape/outside.md)\n");

  const findings = diagnoseAssets(root);

  assert.ok(findings.some(({code, path}) => code === "unsafe-relative-link" && path === ".github/docs/symlink-link.md"));
});

test("repositoryPathKind accepts only the canonical root CLAUDE alias", () => {
  const root = createFixtureRepository();
  const claudePath = join(root, "CLAUDE.md");
  symlinkSync("AGENTS.md", claudePath, "file");

  assert.equal(repositoryPathKind(root, claudePath), "file");

  rmSync(claudePath);
  const wrongTarget = join(root, "NOT-AGENTS.md");
  writeFileSync(wrongTarget, "# Wrong target\n");
  symlinkSync("NOT-AGENTS.md", claudePath, "file");

  assert.equal(repositoryPathKind(root, claudePath), undefined);

  rmSync(claudePath);
  symlinkSync("agents.md", claudePath, "file");

  assert.equal(repositoryPathKind(root, claudePath), undefined);

  const nestedAlias = join(root, "sites", "example", "CLAUDE.md");
  mkdirSync(dirname(nestedAlias), {recursive: true});
  symlinkSync(join(root, "AGENTS.md"), nestedAlias, "file");

  assert.equal(repositoryPathKind(root, nestedAlias), undefined);
});

test("inventoryAssets ignores symlinked asset source files", () => {
  const root = createFixtureRepository();
  const outside = mkdtempSync(join(tmpdir(), "arolariu-checker-asset-"));
  repositories.push(outside);
  const outsideSkill = join(outside, "SKILL.md");
  writeFileSync(outsideSkill, ["---", "name: outside-skill", "description: Outside repository", "---", ""].join("\n"));

  const skillDirectory = join(root, ".github", "skills", "escape");
  mkdirSync(skillDirectory, {recursive: true});
  symlinkSync(outsideSkill, join(skillDirectory, "SKILL.md"), "file");

  const assets = inventoryAssets(root);

  assert.ok(!assets.some(({path}) => path === ".github/skills/escape/SKILL.md"));
});

test("diagnoseAssets ignores symlinked resource source files", () => {
  const root = createFixtureRepository();
  const outside = mkdtempSync(join(tmpdir(), "arolariu-checker-resource-"));
  repositories.push(outside);
  const outsideResource = join(outside, "external.md");
  writeFileSync(outsideResource, "[outside](./missing.md)\n");

  const resourceDirectory = join(root, ".github", "skills", "fix-bug", "references");
  mkdirSync(resourceDirectory, {recursive: true});
  symlinkSync(outsideResource, join(resourceDirectory, "external.md"), "file");

  const findings = diagnoseAssets(root);

  assert.ok(!findings.some(({path}) => path === ".github/skills/fix-bug/references/external.md"));
});

test("diagnoseAssets requires governance scopes for extensions, memory, and MCP", () => {
  const root = createFixtureRepository();
  write(
    root,
    ".github/instructions/agent-governance.instructions.md",
    ["---", "name: Agent Governance", "description: Agent asset rules", 'applyTo: ".github/**/*.md"', "---", ""].join("\n"),
  );

  const findings = diagnoseAssets(root);

  assert.ok(findings.some(({code}) => code === "governance-scope-missing"));
});
