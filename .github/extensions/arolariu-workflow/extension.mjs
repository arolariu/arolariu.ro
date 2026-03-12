import { execFile } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

const cwd = process.cwd();
const isWindows = process.platform === "win32";

function runCommand(command) {
    return new Promise((resolve) => {
        const shell = isWindows ? "powershell" : "bash";
        const shellArgs = isWindows
            ? ["-NoProfile", "-Command", command]
            : ["-c", command];
        execFile(shell, shellArgs, { cwd, timeout: 60000 }, (err, stdout, stderr) => {
            if (err) resolve(`Error: ${stderr || err.message}`);
            else resolve(stdout.trim());
        });
    });
}

const session = await joinSession({
    onPermissionRequest: approveAll,
    hooks: {
        onSessionStart: async () => {
            await session.log("🔧 arolariu-workflow: Custom tools active (lookup_rfc, check_project_health, list_stores)");
        },
    },
    tools: [
        {
            name: "arolariu_lookup_rfc",
            description: "Look up an RFC document from docs/rfc/ by its number (e.g., '1003' or '2001'). Returns the title, status, and first ~100 lines of content.",
            parameters: {
                type: "object",
                properties: {
                    rfc_number: {
                        type: "string",
                        description: "The RFC number to look up, e.g., '1003', '2001', '0001'",
                    },
                },
                required: ["rfc_number"],
            },
            handler: async (args) => {
                const rfcDir = join(cwd, "docs", "rfc");
                if (!existsSync(rfcDir)) return "Error: docs/rfc/ directory not found.";

                const files = readdirSync(rfcDir);
                const padded = args.rfc_number.padStart(4, "0");
                const match = files.find((f) => f.startsWith(padded) && f.endsWith(".md"));

                if (!match) {
                    const available = files.filter((f) => f.endsWith(".md")).map((f) => f.replace(".md", "")).join("\n  ");
                    return `RFC ${args.rfc_number} not found. Available RFCs:\n  ${available}`;
                }

                try {
                    const content = readFileSync(join(rfcDir, match), "utf-8");
                    const lines = content.split("\n");
                    const title = lines.find((l) => l.startsWith("# ")) || match;
                    const preview = lines.slice(0, 100).join("\n");
                    return `📄 ${title}\nFile: docs/rfc/${match}\n\n${preview}\n\n... (${lines.length} total lines)`;
                } catch (e) {
                    return `Error reading RFC: ${e.message}`;
                }
            },
        },
        {
            name: "arolariu_check_project_health",
            description: "Run lint, format check, and/or tests for a specific project in the monorepo. Projects: 'website', 'api', 'components', 'all'.",
            parameters: {
                type: "object",
                properties: {
                    project: {
                        type: "string",
                        description: "The project to check: 'website', 'api', 'components', or 'all'",
                    },
                    checks: {
                        type: "string",
                        description: "Comma-separated checks to run: 'lint', 'format', 'test', or 'all'. Default: 'lint'",
                    },
                },
                required: ["project"],
            },
            handler: async (args) => {
                const project = args.project.toLowerCase();
                const checks = (args.checks || "lint").toLowerCase().split(",").map((s) => s.trim());
                const results = [];

                const commands = {
                    website: { lint: "npm run lint", format: "npx prettier --check sites/arolariu.ro/", test: "npm run test:website" },
                    api: { lint: "dotnet build sites/api.arolariu.ro/src/Core --no-restore -warnaserror", test: "dotnet test sites/api.arolariu.ro/tests --no-restore" },
                    components: { lint: "npm run lint", test: "npm run build:components" },
                };

                const targets = project === "all" ? Object.keys(commands) : [project];
                const runChecks = checks.includes("all") ? ["lint", "format", "test"] : checks;

                for (const target of targets) {
                    const cmds = commands[target];
                    if (!cmds) {
                        results.push(`❌ Unknown project: ${target}`);
                        continue;
                    }
                    for (const check of runChecks) {
                        const cmd = cmds[check];
                        if (!cmd) {
                            results.push(`⏭️ ${target}/${check}: Not available`);
                            continue;
                        }
                        results.push(`▶️ Running ${target}/${check}...`);
                        const output = await runCommand(cmd);
                        const passed = !output.startsWith("Error:");
                        results.push(`${passed ? "✅" : "❌"} ${target}/${check}: ${output.slice(0, 500)}`);
                    }
                }

                return results.join("\n");
            },
        },
        {
            name: "arolariu_list_stores",
            description: "List all Zustand stores in the website project with their state shape and actions.",
            parameters: { type: "object", properties: {} },
            handler: async () => {
                const storesDir = join(cwd, "sites", "arolariu.ro", "src", "stores");
                if (!existsSync(storesDir)) return "Error: stores directory not found.";

                const files = readdirSync(storesDir).filter(
                    (f) => f.endsWith(".ts") || f.endsWith(".tsx")
                );

                const results = [`📦 Zustand Stores (${files.length} files in src/stores/):\n`];

                for (const file of files) {
                    try {
                        const content = readFileSync(join(storesDir, file), "utf-8");
                        const lines = content.split("\n").length;

                        // Extract store name from create() or export
                        const storeMatch = content.match(/export\s+const\s+(\w+)\s*=/);
                        const storeName = storeMatch ? storeMatch[1] : file.replace(/\.(ts|tsx)$/, "");

                        // Check for persistence
                        const hasPersist = content.includes("persist");
                        const hasDevtools = content.includes("devtools");

                        results.push(
                            `  📋 ${file} (${lines} lines)` +
                            `\n     Store: ${storeName}` +
                            `\n     Persistence: ${hasPersist ? "IndexedDB" : "None"}` +
                            `\n     Devtools: ${hasDevtools ? "Yes" : "No"}\n`
                        );
                    } catch (e) {
                        results.push(`  ❌ ${file}: Error reading (${e.message})`);
                    }
                }

                return results.join("\n");
            },
        },
    ],
});
