import {existsSync} from "node:fs";
import {
	dirname,
	join,
	resolve,
} from "node:path";

import {joinSession} from "@github/copilot-sdk/extension";

import {diagnoseAssets} from "./diagnostics.mjs";
import {inventoryAssets} from "./inventory.mjs";

function findRepositoryRoot(startPath) {
	let current = resolve(startPath);
	while (true) {
		if (existsSync(join(current, ".git"))) return current;
		const parent = dirname(current);
		if (parent === current) {
			throw new Error(`Git repository not found from ${startPath}`);
		}
		current = parent;
	}
}

function success(value) {
	return {
		resultType: "success",
		textResultForLlm:
			typeof value === "string"
				? value
				: JSON.stringify(value, null, 2),
	};
}

function failure(error) {
	return {
		resultType: "failure",
		textResultForLlm:
			error instanceof Error ? error.message : String(error),
	};
}

const repositoryRoot = findRepositoryRoot(process.cwd());
const tools = [
	{
		description:
			"Inventory repository AI agents, instructions, prompts, skills, extensions, memory, and Copilot client configuration from live directories.",
		handler: async () => {
			try {
				return success(inventoryAssets(repositoryRoot));
			} catch (error) {
				return failure(error);
			}
		},
		name: "arolariu_ai_inventory",
		parameters: {
			properties: {},
			type: "object",
		},
	},
	{
		description:
			"Run read-only AI asset diagnostics for metadata, names, links, stale copied guidance, memory policy, and unsafe extension patterns.",
		handler: async () => {
			try {
				const findings = diagnoseAssets(repositoryRoot);
				return success(
					findings.length === 0
						? "AI doctor: clean"
						: findings,
				);
			} catch (error) {
				return failure(error);
			}
		},
		name: "arolariu_ai_doctor",
		parameters: {
			properties: {},
			type: "object",
		},
	},
];

const session = await joinSession({tools});
await session.log("arolariu-checker: read-only AI diagnostics enabled");
