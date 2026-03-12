import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

const cwd = process.cwd();

// Read actual versions from source of truth
function getVersions() {
	const versions = {};
	try {
		const rootPkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
		const deps = { ...rootPkg.dependencies, ...rootPkg.devDependencies };
		versions.nextjs = deps["next"]?.replace("^", "") || "unknown";
		versions.react = deps["react"]?.replace("^", "") || "unknown";
		versions.typescript = deps["typescript"]?.replace("^", "") || "unknown";
		versions.zustand = deps["zustand"]?.replace("^", "") || "unknown";
		versions.nextIntl = deps["next-intl"]?.replace("^", "") || "unknown";
		versions.vitest = deps["vitest"]?.replace("^", "") || "unknown";
		versions.tailwind = deps["tailwindcss"]?.replace("^", "") || "unknown";
		versions.node = rootPkg.engines?.node || ">=24";
	} catch {
		/* ignore */
	}

	try {
		const propsPath = join(cwd, "sites", "api.arolariu.ro", "Directory.Build.props");
		if (existsSync(propsPath)) {
			const props = readFileSync(propsPath, "utf-8");
			const match = props.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
			versions.dotnet = match ? match[1] : "net10.0";
		}
	} catch {
		/* ignore */
	}

	return versions;
}

// RFC domain map for keyword-based context injection
const RFC_MAP = {
	invoice: {
		rfcs: ["2001", "2003"],
		paths: ["sites/api.arolariu.ro/src/Invoices/", "sites/arolariu.ro/src/app/domains/invoices/"],
	},
	merchant: { rfcs: ["2001"], paths: ["sites/api.arolariu.ro/src/Invoices/DDD/Entities/Merchants/"] },
	auth: { rfcs: ["2003"], paths: ["sites/api.arolariu.ro/src/Core.Auth/"] },
	telemetry: {
		rfcs: ["1001", "2002"],
		paths: ["sites/arolariu.ro/src/telemetry.ts", "sites/api.arolariu.ro/src/Common/Telemetry/"],
	},
	observability: { rfcs: ["1001", "2002"], paths: ["sites/arolariu.ro/src/instrumentation.ts"] },
	i18n: { rfcs: ["1003"], paths: ["sites/arolariu.ro/messages/", "sites/arolariu.ro/src/i18n/"] },
	internationalization: { rfcs: ["1003"], paths: ["sites/arolariu.ro/messages/"] },
	translation: { rfcs: ["1003"], paths: ["sites/arolariu.ro/messages/"] },
	metadata: { rfcs: ["1004"], paths: ["sites/arolariu.ro/src/metadata.ts"] },
	seo: { rfcs: ["1004"], paths: ["sites/arolariu.ro/src/metadata.ts"] },
	zustand: { rfcs: ["1005"], paths: ["sites/arolariu.ro/src/stores/"] },
	store: { rfcs: ["1005"], paths: ["sites/arolariu.ro/src/stores/"] },
	state: { rfcs: ["1005"], paths: ["sites/arolariu.ro/src/stores/"] },
	component: { rfcs: ["1006"], paths: ["packages/components/src/"] },
	bicep: { rfcs: ["0001"], paths: ["infra/Azure/Bicep/"] },
	infrastructure: { rfcs: ["0001"], paths: ["infra/Azure/Bicep/"] },
	workflow: { rfcs: ["0001"], paths: [".github/workflows/"] },
	"ci/cd": { rfcs: ["0001"], paths: [".github/workflows/"] },
	ddd: { rfcs: ["2001", "2003"], paths: ["sites/api.arolariu.ro/src/Invoices/DDD/"] },
	broker: { rfcs: ["2003"], paths: ["sites/api.arolariu.ro/src/Invoices/Brokers/"] },
	jsdoc: { rfcs: ["1002"], paths: [] },
	documentation: { rfcs: ["1002", "2004"], paths: ["docs/rfc/"] },
	xml: { rfcs: ["2004"], paths: [] },
};

function detectDomainKeywords(prompt) {
	const lower = prompt.toLowerCase();
	const matches = [];
	for (const [keyword, info] of Object.entries(RFC_MAP)) {
		if (lower.includes(keyword)) {
			matches.push({ keyword, ...info });
		}
	}
	return matches;
}

// Project-specific context based on file paths mentioned in prompts
const PROJECT_CONTEXT = {
	"sites/arolariu.ro": {
		name: "Frontend (Next.js)",
		commands: "npm run dev:website | npm run build:website | npm run test:website",
		patterns: "RSC by default, Island pattern (page.tsx → island.tsx), useShallow for Zustand selectors",
		rfcs: "1001-1007",
	},
	"sites/api.arolariu.ro": {
		name: "Backend (.NET)",
		commands: "dotnet build src/Core | dotnet test tests",
		patterns: "The Standard layers, Florance Pattern (max 2-3 deps), TryCatch + Activity tracing",
		rfcs: "2001-2004",
	},
	"packages/components": {
		name: "Component Library",
		commands: "npm run build:components | npm run dev:components (Storybook)",
		patterns: "Domain-agnostic, forwardRef, cn() for classes, barrel export in src/index.ts",
		rfcs: "1006",
	},
	"sites/exp.arolariu.ro": {
		name: "Experimental Service (Python)",
		commands: "python -m ruff check . | python -m pytest -q",
		patterns: "FastAPI, Ruff linting, PEP 695 type aliases, *.test.py pattern",
		rfcs: "N/A",
	},
	"sites/cv.arolariu.ro": {
		name: "CV Site (SvelteKit)",
		commands: "npm run build:cv | npm run dev:cv",
		patterns: "STANDALONE — no cross-deps, SvelteKit 2, Azure Static Web Apps",
		rfcs: "N/A",
	},
};

function detectProject(prompt) {
	for (const [path, info] of Object.entries(PROJECT_CONTEXT)) {
		// Match file paths, directory references, or project names
		if (prompt.includes(path) || prompt.includes(path.split("/").pop())) {
			return { path, ...info };
		}
	}
	return null;
}

const session = await joinSession({
	onPermissionRequest: approveAll,
	hooks: {
		onSessionStart: async () => {
			const v = getVersions();
			const context = [
				"=== arolariu.ro Monorepo — Live Codebase Context ===",
				`Versions (from package.json): Next.js ${v.nextjs}, React ${v.react}, TypeScript ${v.typescript}, Zustand ${v.zustand}, next-intl ${v.nextIntl}, Vitest ${v.vitest}, Tailwind CSS ${v.tailwind}, Node ${v.node}`,
				`Backend: .NET ${v.dotnet || "10.0"} (C# 13)`,
				"Zustand stores: invoicesStore, merchantsStore, scansStore, preferencesStore (all IndexedDB-persisted)",
				"Bounded contexts: General (Core), Auth (Core.Auth), Invoices (Domain), Common (Shared)",
				"Sites: arolariu.ro (Next.js), api.arolariu.ro (.NET), cv.arolariu.ro (SvelteKit), exp.arolariu.ro (Python/FastAPI), docs.arolariu.ro (DocFX)",
			].join("\n");

			await session.log("arolariu-context: Injected live codebase versions");
			return { additionalContext: context };
		},
		onUserPromptSubmitted: async (input) => {
			// Domain keyword detection (existing)
			const matches = detectDomainKeywords(input.prompt);
			let domainContext = null;
			if (matches.length > 0) {
				const rfcSet = [...new Set(matches.flatMap((m) => m.rfcs))];
				const pathSet = [...new Set(matches.flatMap((m) => m.paths))].slice(0, 5);
				const keywords = matches.map((m) => m.keyword).join(", ");

				domainContext = [
					`Domain keywords detected: ${keywords}`,
					`Relevant RFCs: ${rfcSet.map((r) => `docs/rfc/${r.length === 4 ? r : "000" + r}-*.md`).join(", ")}`,
					pathSet.length > 0 ? `Key paths: ${pathSet.join(", ")}` : "",
				]
					.filter(Boolean)
					.join("\n");
			}

			// Detect project context from file paths in the prompt
			const project = detectProject(input.prompt);
			let projectContext = null;
			if (project) {
				projectContext = [
					`📂 Project: ${project.name} (${project.path})`,
					`Commands: ${project.commands}`,
					`Patterns: ${project.patterns}`,
					project.rfcs !== "N/A" ? `RFCs: ${project.rfcs}` : "",
				]
					.filter(Boolean)
					.join("\n");
			}

			// Merge both contexts when both are detected
			if (domainContext && projectContext) {
				return { additionalContext: domainContext + "\n\n" + projectContext };
			}
			if (domainContext) {
				return { additionalContext: domainContext };
			}
			if (projectContext) {
				return { additionalContext: projectContext };
			}
		},
	},
	tools: [],
});
