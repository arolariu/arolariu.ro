import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
type OctokitClient = ReturnType<typeof github.getOctokit>;
/**
 * Interface for script parameters
 */
interface ScriptParams {
    github: OctokitClient;
    context: typeof github.context;
    core: typeof core;
    exec: typeof exec;
}
/**
 * Main function to create a comment on a pull request with test and build results.
 * @param params - The script parameters.
 * @returns A promise that resolves when the comment is created or if the process is skipped.
 */
declare const _default: (params: ScriptParams) => Promise<void>;
export default _default;
