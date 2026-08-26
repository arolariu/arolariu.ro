import {joinSession} from "@github/copilot-sdk/extension";

import {classifyToolCall} from "./policy.mjs";

let session;

session = await joinSession({
	hooks: {
		onSessionStart: async () => {
			await session.log(
				"arolariu-guardrails: destructive-operation checks enabled",
			);
		},
		onPreToolUse: async (input) =>
			classifyToolCall({
				...input,
				repositoryRoot: process.cwd(),
			}),
	},
	tools: [],
});
