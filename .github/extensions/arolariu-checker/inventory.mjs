import {
	readdirSync,
	readFileSync,
} from "node:fs";
import {
	basename,
	join,
	relative,
} from "node:path";

import {parseFrontmatter} from "./frontmatter.mjs";
import {
	isSafeRepositoryFile,
	repositoryPathKind,
} from "./path-safety.mjs";

function toRepositoryPath(value) {
	return value.replaceAll("\\", "/");
}

function filesIn(repositoryRoot, path, predicate) {
	if (repositoryPathKind(repositoryRoot, path) !== "directory") return [];
	return readdirSync(path, {withFileTypes: true})
		.filter(
			(entry) =>
				entry.isFile() &&
				predicate(entry.name) &&
				isSafeRepositoryFile(repositoryRoot, join(path, entry.name)),
		)
		.map((entry) => join(path, entry.name));
}

function filesInRecursive(repositoryRoot, path, predicate) {
	if (repositoryPathKind(repositoryRoot, path) !== "directory") return [];
	return readdirSync(path, {withFileTypes: true}).flatMap((entry) => {
		const candidate = join(path, entry.name);
		if (entry.isDirectory()) {
			return filesInRecursive(repositoryRoot, candidate, predicate);
		}
		return entry.isFile() &&
			predicate(entry.name) &&
			isSafeRepositoryFile(repositoryRoot, candidate)
			? [candidate]
			: [];
	});
}

function directoriesIn(repositoryRoot, path) {
	if (repositoryPathKind(repositoryRoot, path) !== "directory") return [];
	return readdirSync(path, {withFileTypes: true})
		.filter(
			(entry) =>
				entry.isDirectory() &&
				repositoryPathKind(
					repositoryRoot,
					join(path, entry.name),
				) === "directory",
		)
		.map((entry) => join(path, entry.name));
}

function markdownAsset(type, absolutePath, repositoryRoot) {
	const metadata = parseFrontmatter(readFileSync(absolutePath, "utf8"));
	return {
		name:
			metadata.name ??
			basename(absolutePath)
				.replace(".instructions.md", "")
				.replace(".prompt.md", "")
				.replace(".agent.md", ""),
		path: toRepositoryPath(relative(repositoryRoot, absolutePath)),
		type,
	};
}

/**
 * Discovers supported repository AI assets from live directories.
 * @param {string} repositoryRoot - Absolute repository root.
 * @returns {Array<{type: string, name: string, path: string}>} Assets.
 */
export function inventoryAssets(repositoryRoot) {
	const githubRoot = join(repositoryRoot, ".github");
	const assets = [];

	for (const path of filesIn(
		repositoryRoot,
		join(githubRoot, "agents"),
		(name) => name.endsWith(".agent.md"),
	)) {
		assets.push(markdownAsset("agent", path, repositoryRoot));
	}

	for (const path of filesInRecursive(
		repositoryRoot,
		join(githubRoot, "instructions"),
		(name) => name.endsWith(".instructions.md"),
	)) {
		assets.push(markdownAsset("instruction", path, repositoryRoot));
	}

	for (const path of filesIn(
		repositoryRoot,
		join(githubRoot, "prompts"),
		(name) => name.endsWith(".prompt.md"),
	)) {
		assets.push(markdownAsset("prompt", path, repositoryRoot));
	}

	for (const directory of directoriesIn(
		repositoryRoot,
		join(githubRoot, "skills"),
	)) {
		const path = join(directory, "SKILL.md");
		if (isSafeRepositoryFile(repositoryRoot, path)) {
			assets.push(markdownAsset("skill", path, repositoryRoot));
		}
	}

	for (const directory of directoriesIn(
		repositoryRoot,
		join(githubRoot, "extensions"),
	)) {
		const path = join(directory, "extension.mjs");
		if (isSafeRepositoryFile(repositoryRoot, path)) {
			assets.push({
				name: basename(directory),
				path: toRepositoryPath(relative(repositoryRoot, path)),
				type: "extension",
			});
		}
	}

	const memoryPath = join(githubRoot, "memory", "memory.json");
	if (isSafeRepositoryFile(repositoryRoot, memoryPath)) {
		assets.push({
			name: "memory",
			path: toRepositoryPath(relative(repositoryRoot, memoryPath)),
			type: "memory",
		});
	}

	const workspaceMcpPath = join(githubRoot, "mcp.json");
	if (isSafeRepositoryFile(repositoryRoot, workspaceMcpPath)) {
		assets.push({
			name: "mcp",
			path: toRepositoryPath(
				relative(repositoryRoot, workspaceMcpPath),
			),
			type: "client-config",
		});
	}

	for (const path of filesIn(
		repositoryRoot,
		join(repositoryRoot, ".copilot"),
		(name) => name.endsWith(".json"),
	)) {
		assets.push({
			name: basename(path, ".json"),
			path: toRepositoryPath(relative(repositoryRoot, path)),
			type: "client-config",
		});
	}

	return assets.sort(
		(left, right) =>
			left.type.localeCompare(right.type) ||
			left.path.localeCompare(right.path),
	);
}
