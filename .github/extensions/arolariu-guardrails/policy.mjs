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
const DROP_SQL = /\bDROP\s+(?:DATABASE|TABLE)\b/i;
const UNRESOLVED_TARGET =
	/(?:\$\w+|\$\{[^}]+\}|\$\(|`|%[^%]+%|[*?]|^@\()/;
const COMMAND_SEPARATORS = new Set([
	";",
	"&",
	"&&",
	"|",
	"||",
]);
const POWERSHELL_PATH_PARAMETERS = new Set([
	"literalpath",
	"path",
]);
const POWERSHELL_SWITCH_PARAMETERS = new Set([
	"confirm",
	"force",
	"recurse",
	"verbose",
	"whatif",
]);
const POWERSHELL_VALUE_PARAMETERS = new Set([
	"credential",
	"erroraction",
	"errorvariable",
	"exclude",
	"filter",
	"include",
	"informationaction",
	"informationvariable",
	"outvariable",
	"pipelinevariable",
	"progressaction",
	"stream",
	"warningaction",
	"warningvariable",
]);
const GIT_OPTIONS_WITH_VALUE = new Set([
	"--exec",
	"--push-option",
	"--receive-pack",
	"--repo",
	"-o",
]);

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

function commandName(token) {
	return token.replaceAll("\\", "/").split("/").at(-1).toLowerCase();
}

function lexCommand(command, dialect) {
	const tokens = [];
	let current = "";
	let quote;

	const pushCurrent = () => {
		if (current) {
			tokens.push(current);
			current = "";
		}
	};

	for (let index = 0; index < command.length; index += 1) {
		const character = command[index];

		if (quote) {
			if (character === quote) {
				quote = undefined;
			} else if (
				dialect === "powershell" &&
				character === "`" &&
				index + 1 < command.length
			) {
				current += command[index + 1];
				index += 1;
			} else if (
				dialect === "bash" &&
				character === "\\" &&
				quote === '"' &&
				index + 1 < command.length
			) {
				const escaped = command[index + 1];
				current += /[$`"\\\n]/.test(escaped)
					? escaped
					: `\\${escaped}`;
				index += 1;
			} else {
				current += character;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === "\r") continue;
		if (character === "\n" || character === ";") {
			pushCurrent();
			tokens.push(";");
			continue;
		}

		if (character === "&" || character === "|") {
			pushCurrent();
			if (command[index + 1] === character) {
				tokens.push(character + character);
				index += 1;
			} else {
				tokens.push(character);
			}
			continue;
		}

		if (/\s/.test(character)) {
			pushCurrent();
			continue;
		}

		if (
			dialect === "powershell" &&
			character === "`" &&
			index + 1 < command.length
		) {
			current += command[index + 1];
			index += 1;
			continue;
		}

		if (
			dialect === "bash" &&
			character === "\\" &&
			index + 1 < command.length
		) {
			current += command[index + 1];
			index += 1;
			continue;
		}

		current += character;
	}

	pushCurrent();

	const segments = [];
	let segment = [];
	for (const token of tokens) {
		if (COMMAND_SEPARATORS.has(token)) {
			if (segment.length > 0) segments.push(segment);
			segment = [];
		} else {
			segment.push(token);
		}
	}
	if (segment.length > 0) segments.push(segment);

	return {segments, unclosedQuote: Boolean(quote)};
}

function splitTargets(token) {
	return token
		.split(",")
		.map((target) => target.trim())
		.filter(Boolean);
}

function isPowerShellParameter(token, parameter) {
	const name = token
		.slice(1)
		.split(":", 1)[0]
		.toLowerCase();
	return name.length > 0 && parameter.startsWith(name);
}

function parseRemoveItem(arguments_) {
	const recursive = arguments_.some(
		(token) =>
			token.startsWith("-") &&
			isPowerShellParameter(token, "recurse"),
	);
	if (!recursive) return undefined;

	const targets = [];
	let ambiguous = false;

	for (let index = 0; index < arguments_.length; index += 1) {
		const token = arguments_[index];
		if (!token.startsWith("-")) {
			targets.push(...splitTargets(token));
			continue;
		}

		const [rawName, inlineValue] = token.slice(1).split(/:(.*)/s, 2);
		const name = rawName.toLowerCase();
		const matchingPathParameter = [...POWERSHELL_PATH_PARAMETERS].find(
			(parameter) => parameter.startsWith(name),
		);
		if (matchingPathParameter) {
			const value = inlineValue ?? arguments_[index + 1];
			if (value) {
				targets.push(...splitTargets(value));
				if (inlineValue === undefined) index += 1;
			} else {
				ambiguous = true;
			}
			continue;
		}

		if (
			[...POWERSHELL_SWITCH_PARAMETERS].some((parameter) =>
				parameter.startsWith(name),
			)
		) {
			continue;
		}

		if (
			[...POWERSHELL_VALUE_PARAMETERS].some((parameter) =>
				parameter.startsWith(name),
			)
		) {
			if (inlineValue === undefined) index += 1;
			continue;
		}

		ambiguous = true;
	}

	return {ambiguous, targets};
}

function parseRm(arguments_) {
	const recursive = arguments_.some(
		(token) =>
			token === "--recursive" ||
			(/^-[^-]/.test(token) && token.toLowerCase().includes("r")),
	);
	if (!recursive) return undefined;

	const targets = [];
	let optionsEnded = false;
	for (const token of arguments_) {
		if (!optionsEnded && token === "--") {
			optionsEnded = true;
			continue;
		}
		if (!optionsEnded && token.startsWith("-")) continue;
		targets.push(...splitTargets(token));
	}

	return {ambiguous: false, targets};
}

function recursiveDeletions(command, dialect) {
	const {segments, unclosedQuote} = lexCommand(command, dialect);
	const invocations = [];

	for (const segment of segments) {
		for (let index = 0; index < segment.length; index += 1) {
			const name = commandName(segment[index]);
			const arguments_ = segment.slice(index + 1);
			const invocation =
				name === "rm"
					? parseRm(arguments_)
					: name === "remove-item"
						? parseRemoveItem(arguments_)
						: undefined;

			if (invocation) {
				invocations.push({
					...invocation,
					ambiguous: invocation.ambiguous || unclosedQuote,
				});
				break;
			}
		}
	}

	return invocations;
}

function wildcardMatches(pattern, value) {
	const expression = pattern
		.replaceAll(/[.+^${}()|[\]\\]/g, "\\$&")
		.replaceAll("*", ".*")
		.replaceAll("?", ".");
	return new RegExp(`^${expression}$`, "i").test(value);
}

function protectedDestination(refspec) {
	const normalized = refspec.replace(/^\+/, "");
	const separator = normalized.lastIndexOf(":");
	const destination =
		separator >= 0 ? normalized.slice(separator + 1) : normalized;
	return [
		"main",
		"preview",
		"refs/heads/main",
		"refs/heads/preview",
	].some((branch) => wildcardMatches(destination, branch));
}

function classifyGitPush(command, dialect) {
	const {segments} = lexCommand(command, dialect);
	let unresolvedForcedDestination = false;

	for (const segment of segments) {
		const gitIndex = segment.findIndex(
			(token) => commandName(token) === "git",
		);
		if (gitIndex < 0) continue;
		const pushIndex = segment.findIndex(
			(token, index) =>
				index > gitIndex && token.toLowerCase() === "push",
		);
		if (pushIndex < 0) continue;

		let deleteMode = false;
		let globalForce = false;
		let mirrorMode = false;
		let skipNext = false;
		const positionals = [];

		for (const token of segment.slice(pushIndex + 1)) {
			if (skipNext) {
				skipNext = false;
				continue;
			}
			if (
				token === "-f" ||
				token === "--force" ||
				token === "--force-with-lease" ||
				token.startsWith("--force-with-lease=")
			) {
				globalForce = true;
				continue;
			}
			if (token === "-d" || token === "--delete") {
				deleteMode = true;
				continue;
			}
			if (token === "--mirror") {
				mirrorMode = true;
				continue;
			}
			if (GIT_OPTIONS_WITH_VALUE.has(token)) {
				skipNext = true;
				continue;
			}
			if (token.startsWith("-")) continue;
			positionals.push(token);
		}

		const refspecs = positionals.slice(1);
		if (mirrorMode) {
			return {
				permissionDecision: "deny",
				permissionDecisionReason:
					"Mirroring can force-update or delete main and preview and is prohibited.",
			};
		}
		if (globalForce && refspecs.length === 0) {
			unresolvedForcedDestination = true;
			continue;
		}

		for (const refspec of refspecs) {
			const forceRefspec = refspec.startsWith("+");
			const deletionRefspec = refspec.startsWith(":");
			if (
				(globalForce || forceRefspec || deleteMode || deletionRefspec) &&
				protectedDestination(refspec)
			) {
				return {
					permissionDecision: "deny",
					permissionDecisionReason:
						"Force-pushing or deleting main or preview is prohibited.",
				};
			}
		}
	}

	return unresolvedForcedDestination
		? {
				permissionDecision: "ask",
				permissionDecisionReason:
					"Forced push destination is implicit; explicit user confirmation is required.",
			}
		: undefined;
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
	const alias = toolAlias(toolName);
	if (!SHELL_TOOLS.has(alias)) return undefined;

	const command = commandFrom(toolArgs);
	if (!command) return undefined;

	const dialect =
		alias === "powershell" ||
		((alias === "execute" || alias === "shell") &&
			process.platform === "win32")
			? "powershell"
			: "bash";

	const gitPushDecision = classifyGitPush(command, dialect);
	if (gitPushDecision) return gitPushDecision;

	if (DROP_SQL.test(command)) {
		return {
			permissionDecision: "ask",
			permissionDecisionReason:
				"Destructive database operations require explicit user confirmation.",
		};
	}

	let unresolvedDeletion = false;
	for (const deletion of recursiveDeletions(command, dialect)) {
		if (deletion.ambiguous || deletion.targets.length === 0) {
			unresolvedDeletion = true;
			continue;
		}

		for (const target of deletion.targets) {
			if (UNRESOLVED_TARGET.test(target)) {
				unresolvedDeletion = true;
			} else if (isProtectedRoot(target, repositoryRoot, sessionRoot)) {
				return {
					permissionDecision: "deny",
					permissionDecisionReason:
						"Recursive deletion targets a protected root.",
				};
			}
		}
	}

	return unresolvedDeletion
		? {
				permissionDecision: "ask",
				permissionDecisionReason:
					"Recursive deletion target is unresolved; explicit user confirmation is required.",
			}
		: undefined;
}
