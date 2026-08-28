import {joinSession} from "@github/copilot-sdk/extension";

import {
	buildContext,
	findRepositoryRoot,
} from "./resolver.mjs";

let session;

session = await joinSession({
	hooks: {
		onSessionStart: async () => {
			await session.log(
				"arolariu-context: live path-based context enabled",
			);
		},
		onUserPromptSubmitted: async ({prompt, workingDirectory}) => {
			try {
				const repositoryRoot = findRepositoryRoot(workingDirectory);
				const additionalContext = buildContext({
					maxCharacters: 2000,
					prompt,
					repositoryRoot,
					workingDirectory,
				});

				return additionalContext ? {additionalContext} : undefined;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				await session.log(`arolariu-context: ${message}`, {
					level: "warning",
				});
				return undefined;
			}
		},
	},
	tools: [],
});
