import {
	lstatSync,
	readlinkSync,
} from "node:fs";
import {
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";

function canonicalPath(value) {
	return resolve(value);
}

function isInside(repositoryRoot, candidate) {
	const repositoryRelative = relative(repositoryRoot, candidate);
	return (
		repositoryRelative === "" ||
		(!isAbsolute(repositoryRelative) &&
			!/^\.\.(?:[\\/]|$)/.test(repositoryRelative))
	);
}

function statusOf(path) {
	try {
		return lstatSync(path);
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}
		throw error;
	}
}

/**
 * Returns the safe in-repository path kind without following arbitrary
 * symlinks. The root CLAUDE.md -> AGENTS.md alias is the only allowed link.
 * @param {string} repositoryRoot - Absolute repository root.
 * @param {string} candidate - Candidate file or directory.
 * @returns {"file" | "directory" | undefined} Safe path kind.
 */
export function repositoryPathKind(repositoryRoot, candidate) {
	const root = resolve(repositoryRoot);
	const absoluteCandidate = resolve(candidate);
	if (!isInside(root, absoluteCandidate)) return undefined;

	const repositoryRelative = relative(root, absoluteCandidate);
	let current = root;
	let currentStatus = statusOf(root);
	if (!currentStatus?.isDirectory()) return undefined;

	for (const part of repositoryRelative.split(/[\\/]/).filter(Boolean)) {
		current = join(current, part);
		currentStatus = statusOf(current);
		if (!currentStatus) return undefined;

		if (currentStatus.isSymbolicLink()) {
			const allowedAlias = join(root, "CLAUDE.md");
			if (
				canonicalPath(current) !== canonicalPath(allowedAlias) ||
				canonicalPath(absoluteCandidate) !== canonicalPath(allowedAlias)
			) {
				return undefined;
			}

			const target = resolve(dirname(current), readlinkSync(current));
			const expectedTarget = join(root, "AGENTS.md");
			if (canonicalPath(target) !== canonicalPath(expectedTarget)) {
				return undefined;
			}

			const targetStatus = statusOf(target);
			return targetStatus?.isFile() && !targetStatus.isSymbolicLink()
				? "file"
				: undefined;
		}
	}

	if (currentStatus?.isFile()) return "file";
	return currentStatus?.isDirectory() ? "directory" : undefined;
}

/**
 * Checks whether a candidate is a safe regular repository file.
 * @param {string} repositoryRoot - Absolute repository root.
 * @param {string} candidate - Candidate file.
 * @returns {boolean} Whether the file is safe to read.
 */
export function isSafeRepositoryFile(repositoryRoot, candidate) {
	return repositoryPathKind(repositoryRoot, candidate) === "file";
}
