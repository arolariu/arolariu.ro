import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
} from "node:fs";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";

import {parseFrontmatter} from "./frontmatter.mjs";
import {inventoryAssets} from "./inventory.mjs";

const MARKDOWN_TYPES = new Set([
	"agent",
	"instruction",
	"prompt",
	"skill",
]);
const DESCRIPTION_REQUIRED = MARKDOWN_TYPES;
const SOURCE_DERIVED_MEMORY =
	/(?:\b\d+\.\d+(?:\.\d+)?\b|\b(?:npm|dotnet|python|git|gh)\s+(?:run|test|build|install|add|push)\b|\b\d+\s+(?:agents?|skills?|prompts?|instructions?|extensions?|stores?|sites?|components?|RFCs?)\b)/i;
const STALE_COMMAND = /\bnpm run (?:test:website|lint)\b/;
const SEVERITY_ORDER = {
	high: 0,
	medium: 1,
	low: 2,
};

function toRepositoryPath(value) {
	return value.replaceAll("\\", "/");
}

function lineOf(source, index) {
	return source.slice(0, Math.max(index, 0)).split(/\r?\n/).length;
}

function finding(severity, code, path, line, message) {
	return {code, line, message, path, severity};
}

function absolutePath(repositoryRoot, repositoryPath) {
	return join(repositoryRoot, ...repositoryPath.split("/"));
}

function collectMarkdown(path) {
	if (!existsSync(path)) return [];
	const status = statSync(path);
	if (status.isFile()) return path.endsWith(".md") ? [path] : [];

	return readdirSync(path, {withFileTypes: true}).flatMap((entry) =>
		entry.isDirectory()
			? collectMarkdown(join(path, entry.name))
			: entry.name.endsWith(".md")
				? [join(path, entry.name)]
				: [],
	);
}

function markdownFiles(repositoryRoot, assets) {
	const files = assets
		.filter(({type}) => MARKDOWN_TYPES.has(type))
		.map(({path}) => absolutePath(repositoryRoot, path));
	const extras = [
		join(repositoryRoot, ".github", "agent-governance"),
		join(repositoryRoot, ".github", "docs"),
		join(repositoryRoot, ".github", "copilot-instructions.md"),
	];

	return [...new Set([...files, ...extras.flatMap(collectMarkdown)])];
}

function stringsIn(value) {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(stringsIn);
	if (value && typeof value === "object") {
		return Object.values(value).flatMap(stringsIn);
	}
	return [];
}

function brokenLinkFindings(repositoryRoot, path) {
	const source = readFileSync(path, "utf8");
	const repositoryPath = toRepositoryPath(relative(repositoryRoot, path));
	const findings = [];

	for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
		const rawTarget = match[1].trim();
		if (
			/^(?:https?:|mailto:|about:|#|\$\{)/i.test(rawTarget)
		) {
			continue;
		}

		const target = rawTarget
			.replace(/^<|>$/g, "")
			.split(/\s+["'][^"']+["']$/)[0]
			.split("#")[0];
		if (!target) continue;

		const resolved = isAbsolute(target)
			? resolve(target)
			: resolve(dirname(path), target);
		if (!existsSync(resolved)) {
			findings.push(
				finding(
					"medium",
					"broken-relative-link",
					repositoryPath,
					lineOf(source, match.index),
					`Relative link does not exist: ${rawTarget}`,
				),
			);
		}
	}

	return findings;
}

/**
 * Diagnoses repository AI assets without mutating them.
 * @param {string} repositoryRoot - Absolute repository root.
 * @returns {Array<{
 *   severity: "high" | "medium" | "low",
 *   code: string,
 *   path: string,
 *   line: number,
 *   message: string,
 * }>} Sorted findings.
 */
export function diagnoseAssets(repositoryRoot) {
	const assets = inventoryAssets(repositoryRoot);
	const findings = [];
	const duplicateNames = new Map();

	for (const asset of assets) {
		const path = absolutePath(repositoryRoot, asset.path);

		if (MARKDOWN_TYPES.has(asset.type)) {
			const source = readFileSync(path, "utf8");
			const metadata = parseFrontmatter(source);

			if (DESCRIPTION_REQUIRED.has(asset.type) && !metadata.description) {
				findings.push(
					finding(
						"medium",
						"missing-description",
						asset.path,
						1,
						`${asset.type} frontmatter requires a description.`,
					),
				);
			}

			if (
				(asset.type === "agent" || asset.type === "prompt") &&
				metadata.model
			) {
				findings.push(
					finding(
						"medium",
						"pinned-model",
						asset.path,
						lineOf(source, source.indexOf("model:")),
						"Model selection must inherit the active surface default.",
					),
				);
			}

			if (metadata.lastReviewed || metadata.lastUpdated) {
				const key = metadata.lastReviewed
					? "lastReviewed:"
					: "lastUpdated:";
				findings.push(
					finding(
						"low",
						"last-reviewed",
						asset.path,
						lineOf(source, source.indexOf(key)),
						"Git history replaces calendar review metadata.",
					),
				);
			}

			if (asset.type === "skill") {
				const directoryName = basename(dirname(path));
				if (metadata.name !== directoryName) {
					findings.push(
						finding(
							"high",
							"skill-name-mismatch",
							asset.path,
							lineOf(source, source.indexOf("name:")),
							`Skill name '${metadata.name ?? ""}' must match '${directoryName}'.`,
						),
					);
				}
			}

			if (
				asset.type === "instruction" &&
				metadata.applyTo
					?.split(",")
					.map((value) => value.trim())
					.includes("**")
			) {
				findings.push(
					finding(
						"high",
						"global-review-instruction",
						asset.path,
						lineOf(source, source.indexOf("applyTo:")),
						"Global review behavior belongs in the read-only reviewer agent.",
					),
				);
			}

			if (STALE_COMMAND.test(source)) {
				const match = source.match(STALE_COMMAND);
				findings.push(
					finding(
						"medium",
						"stale-command",
						asset.path,
						lineOf(source, match?.index ?? 0),
						"Task assets must use targeted routine validation guidance.",
					),
				);
			}
		}

		if (asset.type === "extension") {
			const source = readFileSync(path, "utf8");
			if (/\bapproveAll\b/.test(source)) {
				findings.push(
					finding(
						"high",
						"approve-all",
						asset.path,
						lineOf(source, source.indexOf("approveAll")),
						"Extensions must not auto-approve permission requests.",
					),
				);
			}
			const shellMatch = source.match(
				/(?:node:child_process|\b(?:exec|execFile|spawn|fork)\s*\()/,
			);
			if (shellMatch) {
				findings.push(
					finding(
						"high",
						"arbitrary-shell-handler",
						asset.path,
						lineOf(source, shellMatch.index ?? 0),
						"Checker and context extensions must not execute arbitrary shell commands.",
					),
				);
			}
		}

		if (asset.type === "memory") {
			const source = readFileSync(path, "utf8");
			try {
				const memory = JSON.parse(source);
				const sourceDerived = stringsIn(memory).find((value) =>
					SOURCE_DERIVED_MEMORY.test(value),
				);
				if (sourceDerived) {
					findings.push(
						finding(
							"medium",
							"source-derived-memory",
							asset.path,
							lineOf(source, source.indexOf(sourceDerived)),
							"Repository memory contains a source-derived snapshot.",
						),
					);
				}
			} catch (error) {
				findings.push(
					finding(
						"high",
						"invalid-json",
						asset.path,
						1,
						`Memory JSON is invalid: ${error instanceof Error ? error.message : String(error)}`,
					),
				);
			}
		}

		const duplicateKey = `${asset.type}:${asset.name.toLowerCase()}`;
		const existing = duplicateNames.get(duplicateKey);
		if (existing) {
			findings.push(
				finding(
					"medium",
					"duplicate-asset-name",
					asset.path,
					1,
					`${asset.type} name '${asset.name}' duplicates ${existing}.`,
				),
			);
		} else {
			duplicateNames.set(duplicateKey, asset.path);
		}
	}

	for (const path of markdownFiles(repositoryRoot, assets)) {
		findings.push(...brokenLinkFindings(repositoryRoot, path));
	}

	return findings.sort(
		(left, right) =>
			SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
			left.path.localeCompare(right.path) ||
			left.line - right.line ||
			left.code.localeCompare(right.code),
	);
}
