import {readFileSync} from "node:fs";
import {join} from "node:path";

const PROFILES = {
	backend: [
		"dotnet build sites/api.arolariu.ro/src/Core",
		"dotnet test sites/api.arolariu.ro/tests",
	],
	components: ["npm run build:components"],
	"frontend-routine": [
		"npm run test:unit",
		"npm run build:website",
	],
};

/**
 * Resolves a validation profile against canonical repository guidance.
 * @param {string} repositoryRoot - Absolute repository root.
 * @param {string} profile - Validation profile name.
 * @returns {{source: string, commands: string[]}} Canonical commands.
 */
export function resolveValidationContext(repositoryRoot, profile) {
	const commands = PROFILES[profile];
	if (!commands) {
		throw new Error(`Unknown validation profile: ${profile}`);
	}

	const source = "AGENTS.md";
	const guidance = readFileSync(join(repositoryRoot, source), "utf8");
	for (const command of commands) {
		if (!guidance.includes(command)) {
			throw new Error(
				`Canonical command missing for profile ${profile}: ${command}`,
			);
		}
	}

	return {commands: [...commands], source};
}
