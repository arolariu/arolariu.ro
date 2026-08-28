import {
	existsSync,
	lstatSync,
	readdirSync,
	readFileSync,
} from "node:fs";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	matchesGlob,
	relative,
	resolve,
} from "node:path";

import {parseFrontmatter} from "./frontmatter.mjs";
import {inventoryAssets} from "./inventory.mjs";
import {
	isSafeRepositoryFile,
	repositoryPathKind,
} from "./path-safety.mjs";

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
const GOVERNANCE_GUIDE_NAMES = new Set([
	"AGENTS.md",
	"CLAUDE.md",
]);
const SKIPPED_GUIDE_DIRECTORIES = new Set([
	".git",
	".next",
	".nx",
	".svelte-kit",
	"bin",
	"dist",
	"node_modules",
	"obj",
]);

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

function collectMarkdown(repositoryRoot, path) {
	const kind = repositoryPathKind(repositoryRoot, path);
	if (kind === "file") return path.endsWith(".md") ? [path] : [];
	if (kind !== "directory") return [];

	return readdirSync(path, {withFileTypes: true}).flatMap((entry) =>
		collectMarkdown(repositoryRoot, join(path, entry.name)),
	);
}

function collectGovernanceGuides(repositoryRoot, path) {
	if (repositoryPathKind(repositoryRoot, path) !== "directory") return [];

	return readdirSync(path, {withFileTypes: true}).flatMap((entry) => {
		const candidate = join(path, entry.name);
		if (
			entry.isDirectory() &&
			!SKIPPED_GUIDE_DIRECTORIES.has(entry.name)
		) {
			return collectGovernanceGuides(repositoryRoot, candidate);
		}
		return GOVERNANCE_GUIDE_NAMES.has(entry.name) &&
			isSafeRepositoryFile(repositoryRoot, candidate)
			? [candidate]
			: [];
	});
}

function markdownFiles(repositoryRoot, assets) {
	const files = assets
		.filter(({type}) => MARKDOWN_TYPES.has(type))
		.map(({path}) => absolutePath(repositoryRoot, path));
	const extras = [
		join(repositoryRoot, ".github", "agent-governance"),
		join(repositoryRoot, ".github", "docs"),
		join(repositoryRoot, ".github", "instructions"),
		join(repositoryRoot, ".github", "skills"),
		join(repositoryRoot, ".github", "copilot-instructions.md"),
		join(repositoryRoot, "AGENTS.md"),
		join(repositoryRoot, "CLAUDE.md"),
	];

	return [
		...new Set([
			...files,
			...extras.flatMap((path) => collectMarkdown(repositoryRoot, path)),
			...collectGovernanceGuides(repositoryRoot, repositoryRoot),
		]),
	];
}

function stringsIn(value) {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(stringsIn);
	if (value && typeof value === "object") {
		return Object.values(value).flatMap(stringsIn);
	}
	return [];
}

function scopeMatches(pattern, path) {
	try {
		return matchesGlob(path, pattern);
	} catch {
		return false;
	}
}

function isUnsafeLinkTarget(repositoryRoot, sourcePath, target) {
	const normalized = target.replaceAll("\\", "/");
	if (
		normalized.startsWith("//") ||
		normalized.startsWith("/") ||
		/^[a-z][a-z0-9+.-]*:/i.test(normalized) ||
		/^[a-z]:\//i.test(normalized) ||
		isAbsolute(target)
	) {
		return true;
	}

	const resolved = resolve(dirname(sourcePath), target);
	const repositoryRelative = relative(repositoryRoot, resolved);
	if (
		isAbsolute(repositoryRelative) ||
		/^\.\.(?:[\\/]|$)/.test(repositoryRelative)
	) {
		return true;
	}

	let current = repositoryRoot;
	for (const part of repositoryRelative.split(/[\\/]/).filter(Boolean)) {
		current = join(current, part);
		try {
			if (lstatSync(current).isSymbolicLink()) return true;
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				return false;
			}
			throw error;
		}
	}

	return false;
}

function fencedCodeRanges(source) {
	return [
		...source.matchAll(
			/^(?<fence>`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^\k<fence>[ \t]*$/gm,
		),
	].map((match) => ({
		end: (match.index ?? 0) + match[0].length,
		start: match.index ?? 0,
	}));
}

function linkTargets(source) {
	const matches = [];
	const patterns = [
		/\[[^\]]+\]\(([^)]+)\)/g,
		/^[ \t]{0,3}\[[^\]]+\]:[ \t]*(?:<([^>]+)>|(\S+))/gm,
		/\b(?:href|src)[ \t]*=[ \t]*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi,
		/<([a-z][a-z0-9+.-]*:[^ >]+|\/\/[^ >]+)>/gi,
	];

	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const rawTarget = match.slice(1).find(Boolean);
			if (rawTarget) {
				matches.push({index: match.index ?? 0, rawTarget});
			}
		}
	}

	return matches.filter(
		(candidate, index) =>
			matches.findIndex(
				(other) =>
					other.index === candidate.index &&
					other.rawTarget === candidate.rawTarget,
			) === index,
	);
}

function brokenLinkFindings(repositoryRoot, path) {
	if (!isSafeRepositoryFile(repositoryRoot, path)) return [];

	const source = readFileSync(path, "utf8");
	const repositoryPath = toRepositoryPath(relative(repositoryRoot, path));
	const findings = [];
	const codeRanges = fencedCodeRanges(source);

	for (const match of linkTargets(source)) {
		if (
			codeRanges.some(
				({end, start}) =>
					match.index >= start && match.index < end,
			)
		) {
			continue;
		}

		const rawTarget = match.rawTarget.trim();
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

		if (isUnsafeLinkTarget(repositoryRoot, path, target)) {
			findings.push(
				finding(
					"high",
					"unsafe-relative-link",
					repositoryPath,
					lineOf(source, match.index),
					`Link target must stay repository-relative: ${rawTarget}`,
				),
			);
			continue;
		}

		const resolved = resolve(dirname(path), target);
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

			if (
				asset.type === "instruction" &&
				basename(path) ===
					"agent-governance.instructions.md"
			) {
				const patterns =
					metadata.applyTo
						?.split(",")
						.map((value) => value.trim())
						.filter(Boolean) ?? [];
				const requiredPaths = [
					".github/extensions/example/extension.mjs",
					".github/memory/memory.json",
					".github/mcp.json",
				];
				const missing = requiredPaths.filter(
					(requiredPath) =>
						!patterns.some((pattern) =>
							scopeMatches(pattern, requiredPath),
						),
				);
				if (missing.length > 0) {
					findings.push(
						finding(
							"high",
							"governance-scope-missing",
							asset.path,
							lineOf(
								source,
								source.indexOf("applyTo:"),
							),
							`Agent governance does not cover: ${missing.join(", ")}.`,
						),
					);
				}
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

		if (
			asset.type === "client-config" &&
			asset.path.startsWith(".copilot/")
		) {
			findings.push(
				finding(
					"high",
					"unsupported-workspace-config",
					asset.path,
					1,
					"Current Copilot workspace MCP configuration belongs at .github/mcp.json.",
				),
			);
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
