import {validateAllMessages} from "./taxonomy.ts";

const issues = validateAllMessages();
if (issues.length > 0) {
  console.error(`[message-tree] Found ${issues.length} message taxonomy issue(s).`);
  for (const issue of issues.slice(0, 200)) {
    console.error(`- ${issue.locale}:${issue.path} — ${issue.message}`);
  }
  if (issues.length > 200) {
    console.error(`[message-tree] ${issues.length - 200} additional issue(s) omitted.`);
  }
  process.exit(1);
}

console.info("[message-tree] Message taxonomy validation passed.");
