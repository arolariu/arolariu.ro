import {
	parse,
	resolve,
} from "node:path";

const SHELL_TOOLS = new Set([
	"bash",
	"execute",
	"powershell",
	"shell",
]);
const PROTECTED_BRANCH =
	/(?:\bmain\b|\bpreview\b|refs\/heads\/(?:main|preview)\b)/i;
const FORCE_FLAG =
	/(?:--force(?:-with-lease)?\b|(?:^|\s)-f(?:\s|$))/i;
const DROP_SQL = /\bDROP\s+(?:DATABASE|TABLE)\b/i;
const UNRESOLVED_TARGET = /(?:\$\w+|\$\{[^}]+\}|%[^%]+%|[*?])/;

function toolAlias(toolName) {
	return String(toolName)
		.toLowerCase()
		.split(/[/.]/)
		.at(-1);
}

function commandFrom(toolArgs) {
	return toolArgs &&
		typeof toolArgs === "object" &&
		typeof toolArgs.command === "string"
		? toolArgs.command
		: undefined;
}

function tokenize(value) {
	const tokens = [];
	const tokenPattern = /"([^"]*)"|'([^']*)'|`([^`]*)`|([^\s;|&]+)/g;

	for (const match of value.matchAll(tokenPattern)) {
		tokens.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
	}

	return tokens;
}

function findPowerShellTarget(command) {
	const match = command.match(/\bRemove-Item\b([\s\S]*)/i);
	if (!match) return undefined;

	const tokens = tokenize(match[1]);
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (/^-(?:LiteralPath|Path)$/i.test(token)) {
			return tokens[index + 1];
		}
		if (!token.startsWith("-")) return token;
	}

	return undefined;
}

function findBashTarget(command) {
	const match = command.match(/\brm\b([\s\S]*)/i);
	if (!match) return undefined;

	for (const token of tokenize(match[1])) {
		if (token === "--") continue;
		if (!token.startsWith("-")) return token;
	}

	return undefined;
}

function recursiveDeletion(command) {
	if (
		/\bRemove-Item\b/i.test(command) &&
		/(?:^|\s)-(?:Recurse|r)(?:\s|$)/i.test(command)
	) {
		return findPowerShellTarget(command);
	}

	if (
		/\brm\b/i.test(command) &&
		/(?:--recursive\b|(?:^|\s)-[a-z]*r[a-z]*(?:\s|$))/i.test(command)
	) {
		return findBashTarget(command);
	}

	return undefined;
}

function canonicalPath(value) {
	return resolve(value).replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
}

function isProtectedRoot(target, repositoryRoot, sessionRoot) {
	const normalizedTarget = target.replaceAll("\\", "/").replace(/\/+$/, "");
	if (normalizedTarget === "" || normalizedTarget === "/") return true;
	if (/^[a-z]:$/i.test(normalizedTarget)) return true;

	const absoluteTarget = resolve(target);
	if (absoluteTarget === parse(absoluteTarget).root) return true;

	const canonicalTarget = canonicalPath(target);
	if (
		repositoryRoot &&
		canonicalTarget === canonicalPath(repositoryRoot)
	) {
		return true;
	}
	if (sessionRoot && canonicalTarget === canonicalPath(sessionRoot)) {
		return true;
	}

	return /\/\.copilot\/session-state(?:\/[^/]+)?$/i.test(canonicalTarget);
}

/**
 * Classifies a tool call that crosses a narrow destructive-operation boundary.
 * @param {{
 *   toolName: string,
 *   toolArgs: unknown,
 *   repositoryRoot?: string,
 *   sessionRoot?: string,
 * }} input - Tool invocation.
 * @returns {{
 *   permissionDecision: "deny" | "ask",
 *   permissionDecisionReason: string,
 * } | undefined} Permission override or no opinion.
 */
export function classifyToolCall({
	toolName,
	toolArgs,
	repositoryRoot,
	sessionRoot,
}) {
	if (!SHELL_TOOLS.has(toolAlias(toolName))) return undefined;

	const command = commandFrom(toolArgs);
	if (!command) return undefined;

	if (
		/\bgit\s+push\b/i.test(command) &&
		FORCE_FLAG.test(command) &&
		PROTECTED_BRANCH.test(command)
	) {
		return {
			permissionDecision: "deny",
			permissionDecisionReason:
				"Force-pushing main or preview is prohibited.",
		};
	}

	if (DROP_SQL.test(command)) {
		return {
			permissionDecision: "ask",
			permissionDecisionReason:
				"Destructive database operations require explicit user confirmation.",
		};
	}

	const target = recursiveDeletion(command);
	if (!target) return undefined;

	if (UNRESOLVED_TARGET.test(target)) {
		return {
			permissionDecision: "ask",
			permissionDecisionReason:
				"Recursive deletion target is unresolved; explicit user confirmation is required.",
		};
	}

	if (isProtectedRoot(target, repositoryRoot, sessionRoot)) {
		return {
			permissionDecision: "deny",
			permissionDecisionReason:
				"Recursive deletion targets a protected root.",
		};
	}

	return undefined;
}
