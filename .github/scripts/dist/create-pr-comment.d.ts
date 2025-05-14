import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
type OctokitClient = ReturnType<typeof github.getOctokit>;
interface ScriptParams {
    github: OctokitClient;
    context: typeof github.context;
    core: typeof core;
    exec: typeof exec;
}
declare const _default: (params: ScriptParams) => Promise<void>;
export default _default;
