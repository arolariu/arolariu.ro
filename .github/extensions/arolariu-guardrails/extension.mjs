import {approveAll} from "@github/copilot-sdk";
import {joinSession} from "@github/copilot-sdk/extension";

// Patterns that should never be executed
const DESTRUCTIVE_PATTERNS = [
	/rm\s+-rf\s+\//i,
	/Remove-Item\s+.*[/\\]\s*-Recurse/i,
	/git\s+push\s+.*--force\s+(origin\s+)?(main|preview)/i,
	/git\s+push\s+-f\s+(origin\s+)?(main|preview)/i,
	/DROP\s+DATABASE/i,
	/DROP\s+TABLE/i,
	/format\s+[a-z]:/i,
];

// Branch protection
const PROTECTED_BRANCHES = ["main", "preview"];

const session = await joinSession({
	onPermissionRequest: approveAll,
	hooks: {
		onPreToolUse: async (input) => {
			// Guard shell commands
			if (input.toolName === "powershell" || input.toolName === "bash") {
				const cmd = String(input.toolArgs?.command || "");

				for (const pattern of DESTRUCTIVE_PATTERNS) {
					if (pattern.test(cmd)) {
						await session.log(
							`🛡️ Guardrails: Blocked destructive command: ${cmd.slice(0, 80)}...`,
							{level: "warning"},
						);
						return {
							permissionDecision: "deny",
							permissionDecisionReason:
								"Blocked by arolariu-guardrails: This command matches a destructive pattern. " +
								"Force-pushing to main/preview, recursive deletions from root, and database drops are prohibited.",
						};
					}
				}

				// Warn on branch checkout to protected branches for direct commits
				const checkoutMatch = cmd.match(/git\s+checkout\s+(-b\s+)?(main|preview)\b/i);
				if (checkoutMatch && !checkoutMatch[1]) {
					return {
						additionalContext:
							"⚠️ You are on a protected branch (main or preview). " +
							"Create a feature branch instead: git checkout -b feat/description",
					};
				}
			}

			// Guard git operations
			if (input.toolName === "powershell" || input.toolName === "bash") {
				const cmd = String(input.toolArgs?.command || "");
				// Detect force push attempts
				if (/git\s+push/.test(cmd) && /(-f|--force)/.test(cmd)) {
					for (const branch of PROTECTED_BRANCHES) {
						if (cmd.includes(branch)) {
							return {
								permissionDecision: "deny",
								permissionDecisionReason: `Force-pushing to '${branch}' is prohibited. Use a feature branch and PR.`,
							};
						}
					}
				}
			}
		},

		onPostToolUse: async (input) => {
			// After file edits, check for common anti-patterns
			if (input.toolName === "edit" || input.toolName === "create") {
				const filePath = String(input.toolArgs?.path || "");

				// Check TypeScript files for 'any' type usage
				if (filePath.match(/\.(ts|tsx)$/) && !filePath.includes("node_modules")) {
					const newStr = String(input.toolArgs?.new_str || input.toolArgs?.file_text || "");

					// Check for explicit 'any' type annotations
					const anyMatches = newStr.match(/:\s*any\b|<any>|as\s+any\b/g);
					if (anyMatches && anyMatches.length > 0) {
						await session.log(
							`⚠️ Guardrails: Detected ${anyMatches.length} 'any' type usage(s) in ${filePath.split(/[/\\]/).pop()}`,
							{level: "warning"},
						);
						return {
							additionalContext:
								`⚠️ STRICT TYPE SAFETY VIOLATION: ${anyMatches.length} 'any' type(s) detected in the code you just wrote. ` +
								"This codebase has zero 'any' tolerance (TypeScript strict mode). " +
								"Replace with proper types: use 'unknown' + type guards, generics, or specific interfaces. " +
								"Review and fix before proceeding.",
						};
					}
				}

				// Check for inline styles in React components
				if (filePath.match(/\.(tsx|jsx)$/) && !filePath.includes("node_modules")) {
					const content = String(input.toolArgs?.new_str || input.toolArgs?.file_text || "");
					if (/style\s*=\s*\{\{/.test(content)) {
						return {
							additionalContext:
								"⚠️ Inline styles detected. This codebase avoids inline style={{...}} objects. " +
								"Use the project's established styling approach: CSS modules, SCSS modules, or utility classes from the component library. " +
								"For shared components, use CSS modules. For site-specific components, follow the site's styling pattern.",
						};
					}
				}

				// Check for missing test companion on new component creation
				if (input.toolName === "create" && filePath.match(/\.(tsx|jsx)$/) && !filePath.includes(".test.") && !filePath.includes(".spec.")) {
					const isComponent =
						filePath.includes("src/components") || filePath.includes("src\\components") ||
						filePath.includes("_components") ||
						/src[/\\]app[/\\].+[/\\]/.test(filePath);
					if (isComponent) {
						const ext = filePath.match(/\.(tsx|jsx)$/)?.[1] || "tsx";
						const testFileName = filePath.split(/[/\\]/).pop()?.replace(`.${ext}`, `.test.${ext}`);
						await session.log(
							`💡 Guardrails: New component created without test companion: ${filePath.split(/[/\\]/).pop()}`,
							{level: "info"},
						);
						return {
							additionalContext:
								`💡 New component created without a test file. Consider creating ${testFileName} ` +
								"with Vitest + Testing Library. Target: 90%+ coverage per project standards.",
						};
					}
				}

				// Check for hardcoded user-facing strings missing i18n (next-intl)
				if (filePath.match(/\.(tsx|jsx)$/) && !filePath.includes("node_modules") && !filePath.includes(".test.") && !filePath.includes(".spec.")) {
					const content = String(input.toolArgs?.new_str || input.toolArgs?.file_text || "");
					// Match JSX text content: >Some Text< (but not single words that could be HTML tags, and not inside {t( calls)
					const hardcodedJsxText = content.match(/>([A-Z][a-z]+(?:\s+[a-zA-Z]+)+)</g);
					if (hardcodedJsxText && hardcodedJsxText.length > 0) {
						const examples = hardcodedJsxText.slice(0, 3).map((m) => m.slice(1, -1)).join('", "');
						await session.log(
							`⚠️ Guardrails: Detected ${hardcodedJsxText.length} potential hardcoded string(s) in ${filePath.split(/[/\\]/).pop()}`,
							{level: "warning"},
						);
						return {
							additionalContext:
								`⚠️ Potential hardcoded user-facing strings detected (e.g. "${examples}"). ` +
								"This codebase uses next-intl for all visible text. " +
								'Use const t = useTranslations("namespace") and {t("key")} instead of inline text. ' +
								"See RFC 1003 for i18n patterns.",
						};
					}
				}

				// Check for missing JSDoc on exported functions/constants
				if (filePath.match(/\.(ts|tsx)$/) && !filePath.includes("node_modules") && !filePath.includes(".test.") && !filePath.includes(".spec.")) {
					const content = String(input.toolArgs?.new_str || input.toolArgs?.file_text || "");
					// Find exports without a preceding JSDoc block (/** ... */)
					const lines = content.split("\n");
					const undocumentedExports = [];
					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						if (/^\s*export\s+(function|const|async\s+function)\s+\w+/.test(line)) {
							// Check if the previous non-empty line ends a JSDoc comment
							let prev = i - 1;
							while (prev >= 0 && /^\s*$/.test(lines[prev])) prev--;
							if (prev < 0 || !lines[prev].trim().endsWith("*/")) {
								const match = line.match(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/);
								if (match) undocumentedExports.push(match[1]);
							}
						}
					}
					if (undocumentedExports.length > 0) {
						const names = undocumentedExports.slice(0, 3).join(", ");
						const remaining = undocumentedExports.length > 3 ? ` and ${undocumentedExports.length - 3} more` : "";
						await session.log(
							`📝 Guardrails: ${undocumentedExports.length} exported symbol(s) missing JSDoc in ${filePath.split(/[/\\]/).pop()}`,
							{level: "info"},
						);
						return {
							additionalContext:
								`📝 Missing JSDoc documentation on exported symbols: ${names}${remaining}. ` +
								"All public APIs require /** */ JSDoc comments per RFC 1002. " +
								"Include @param, @returns, and @example tags for functions.",
						};
					}
				}
			}
		},

		onSessionStart: async () => {
			await session.log("🛡️ arolariu-guardrails: Active — protecting main/preview branches, enforcing type safety");
		},
	},
	tools: [],
});
