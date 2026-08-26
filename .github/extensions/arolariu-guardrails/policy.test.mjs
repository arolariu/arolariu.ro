import assert from "node:assert/strict";
import test from "node:test";

import {classifyToolCall} from "./policy.mjs";

const roots = {
	repositoryRoot: "C:\\repo",
	sessionRoot: "C:\\Users\\dev\\.copilot\\session-state\\abc",
};

function classify(command, toolName = "functions.powershell") {
	return classifyToolCall({
		...roots,
		toolArgs: {command},
		toolName,
	});
}

test("denies force pushes to protected branches", () => {
	assert.equal(
		classify("git push --force origin main").permissionDecision,
		"deny",
	);
	assert.equal(
		classify("git push origin preview --force-with-lease").permissionDecision,
		"deny",
	);
});

test("denies force-refspec pushes to protected destinations", () => {
	assert.equal(
		classify("git push origin +HEAD:main").permissionDecision,
		"deny",
	);
	assert.equal(
		classify("git push origin +HEAD:refs/heads/preview").permissionDecision,
		"deny",
	);
});

test("denies wildcard force-refspecs that can match protected branches", () => {
	assert.equal(
		classify("git push origin +refs/heads/*:refs/heads/*")
			.permissionDecision,
		"deny",
	);
	assert.equal(
		classify(
			"git push origin +refs/heads/feature/*:refs/heads/feature/*",
		),
		undefined,
	);
});

test("denies mirror pushes because they force-update every remote ref", () => {
	assert.equal(
		classify("git push --mirror origin").permissionDecision,
		"deny",
	);
});

test("does not intercept normal or feature-branch pushes", () => {
	assert.equal(
		classify("git push origin refactor/ai-footprint-v2"),
		undefined,
	);
	assert.equal(
		classify("git push --force-with-lease origin feat/example"),
		undefined,
	);
	assert.equal(
		classify("git push --force origin feature/main-menu"),
		undefined,
	);
	assert.equal(
		classify("git push --force origin main:feature/main-menu"),
		undefined,
	);
});

test("asks when a forced push destination is implicit", () => {
	assert.equal(classify("git push --force").permissionDecision, "ask");
});

test("denies recursive deletion of filesystem and repository roots", () => {
	assert.equal(
		classify("Remove-Item -Recurse -Force C:\\").permissionDecision,
		"deny",
	);
	assert.equal(
		classify("Remove-Item -Recurse -Force C:\\repo").permissionDecision,
		"deny",
	);
	assert.equal(classify("rm -rf /", "functions.bash").permissionDecision, "deny");
	assert.equal(
		classify('Remove-Item -Recurse -Force "C:\\repo"')
			.permissionDecision,
		"deny",
	);
});

test("denies recursive deletion of a Copilot session root", () => {
	assert.equal(
		classify(
			"Remove-Item -Recurse -Force C:\\Users\\dev\\.copilot\\session-state\\abc",
		).permissionDecision,
		"deny",
	);
});

test("inspects chained recursive deletion commands", () => {
	assert.equal(
		classify("rm -rf ./safe; rm -rf --no-preserve-root /", "bash")
			.permissionDecision,
		"deny",
	);
	assert.equal(
		classify(
			"Remove-Item -Recurse C:\\repo\\tmp; Remove-Item -Recurse C:\\repo",
		).permissionDecision,
		"deny",
	);
});

test("inspects every recursive deletion operand", () => {
	assert.equal(
		classify("rm -rf ./safe /", "bash").permissionDecision,
		"deny",
	);
	assert.equal(
		classify("Remove-Item -Recurse C:\\repo\\tmp,C:\\repo")
			.permissionDecision,
		"deny",
	);
});

test("does not intercept explicit deletion below protected roots", () => {
	assert.equal(
		classify("Remove-Item C:\\repo\\tmp\\probe.txt"),
		undefined,
	);
	assert.equal(
		classify("Remove-Item -Recurse C:\\repo\\tmp\\probe"),
		undefined,
	);
	assert.equal(
		classify(
			"rm -rf ./tmp/one && rm -rf ./tmp/two",
			"functions.bash",
		),
		undefined,
	);
});

test("asks for unresolved recursive targets", () => {
	assert.equal(
		classify("Remove-Item -Recurse $target").permissionDecision,
		"ask",
	);
	assert.equal(classify("rm -rf ./tmp/*", "bash").permissionDecision, "ask");
	assert.equal(
		classify("Remove-Item -Recurse -Force $(Get-Location)")
			.permissionDecision,
		"ask",
	);
	assert.equal(
		classify('rm -rf "$(pwd)"', "bash").permissionDecision,
		"ask",
	);
	assert.equal(
		classify("rm -rf `pwd`", "bash").permissionDecision,
		"ask",
	);
});

test("asks for destructive database operations", () => {
	assert.equal(
		classify('sqlcmd -Q "DROP TABLE invoices"').permissionDecision,
		"ask",
	);
	assert.equal(
		classify('sqlcmd -Q "DROP DATABASE arolariu"').permissionDecision,
		"ask",
	);
});

test("returns undefined for unrelated tools and malformed arguments", () => {
	assert.equal(
		classifyToolCall({
			...roots,
			toolArgs: {path: "AGENTS.md"},
			toolName: "functions.view",
		}),
		undefined,
	);
	assert.equal(
		classifyToolCall({
			...roots,
			toolArgs: undefined,
			toolName: "powershell",
		}),
		undefined,
	);
});
