import assert from "node:assert/strict";
import {
	afterEach,
	test,
} from "node:test";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import {tmpdir} from "node:os";
import {
	dirname,
	join,
} from "node:path";

import {diagnoseAssets} from "./diagnostics.mjs";
import {parseFrontmatter} from "./frontmatter.mjs";
import {inventoryAssets} from "./inventory.mjs";
import {resolveValidationContext} from "./validation.mjs";

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

function createFixtureRepository({
	memory = {entities: [], relations: []},
	promptName = "fix-bug",
	skillName = "fix-bug",
} = {}) {
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
		[
			"---",
			"name: Backend Expert",
			"description: Backend specialist",
			"---",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/instructions/typescript.instructions.md",
		[
			"---",
			"name: TypeScript",
			"description: Type rules",
			'applyTo: "**/*.ts"',
			"---",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/prompts/fix-bug.prompt.md",
		[
			"---",
			`name: ${promptName}`,
			"description: Bug shortcut",
			"---",
			"",
			"[skill](../skills/fix-bug/SKILL.md)",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/skills/fix-bug/SKILL.md",
		[
			"---",
			`name: ${skillName}`,
			"description: Fix a defect",
			"---",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/extensions/arolariu-context/extension.mjs",
		'import {joinSession} from "@github/copilot-sdk/extension";\n',
	);
	write(root, ".github/memory/memory.json", JSON.stringify(memory));
	write(root, ".copilot/mcp-config.json", '{"mcpServers":{}}\n');

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
		parseFrontmatter(
			[
				"---",
				"name: 'Backend Expert'",
				'description: "Backend"',
				'tools: ["read", "search"]',
				"---",
				"Body",
			].join("\n"),
		),
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

	assert.deepEqual(
		[...new Set(assets.map(({type}) => type))].sort(),
		[
			"agent",
			"client-config",
			"extension",
			"instruction",
			"memory",
			"prompt",
			"skill",
		],
	);
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

test("diagnoseAssets allows a prompt alias to share its skill name", () => {
	const findings = diagnoseAssets(
		createFixtureRepository({
			promptName: "fix-bug",
			skillName: "fix-bug",
		}),
	);

	assert.ok(
		!findings.some(({code}) => code === "duplicate-asset-name"),
	);
});

test("diagnoseAssets reports metadata, scope, link, duplicate, and command drift", () => {
	const root = createFixtureRepository();
	write(
		root,
		".github/skills/duplicate/SKILL.md",
		[
			"---",
			"name: fix-bug",
			"description: Duplicate",
			"---",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/instructions/review.instructions.md",
		[
			"---",
			"name: Review",
			'applyTo: "**"',
			"---",
			"",
			"[missing](./missing.md)",
			"",
		].join("\n"),
	);
	write(
		root,
		".github/prompts/stale.prompt.md",
		[
			"---",
			"name: stale",
			"description: Stale",
			"---",
			"",
			"npm run test:website",
			"",
		].join("\n"),
	);

	const findings = diagnoseAssets(root);

	assert.ok(findings.some(({code}) => code === "missing-description"));
	assert.ok(findings.some(({code}) => code === "duplicate-asset-name"));
	assert.ok(
		findings.some(({code}) => code === "global-review-instruction"),
	);
	assert.ok(findings.some(({code}) => code === "broken-relative-link"));
	assert.ok(findings.some(({code}) => code === "stale-command"));
});

test("resolveValidationContext reads commands from canonical AGENTS.md", () => {
	const result = resolveValidationContext(
		createFixtureRepository(),
		"frontend-routine",
	);

	assert.equal(result.source, "AGENTS.md");
	assert.deepEqual(result.commands, [
		"npm run test:unit",
		"npm run build:website",
	]);
});

test("resolveValidationContext fails explicitly for unknown profiles", () => {
	assert.throws(
		() => resolveValidationContext(createFixtureRepository(), "unknown"),
		/Unknown validation profile: unknown/,
	);
});
