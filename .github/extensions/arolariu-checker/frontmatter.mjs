/**
 * Parses top-level scalar YAML frontmatter values used by Copilot assets.
 * @param {string} source - Markdown source.
 * @returns {Record<string, string>} Parsed scalar metadata.
 */
export function parseFrontmatter(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) return {};

  const metadata = {};
  let continuedKey;
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!match) {
      if (continuedKey && /^\s+\S/.test(line)) {
        const continuation = line.trim();
        if (/^(?:[-[{}]|[\w-]+\s*:)/.test(continuation)) {
          continuedKey = undefined;
        } else if (!continuation.startsWith("#")) {
          metadata[continuedKey] += `${metadata[continuedKey] ? " " : ""}${continuation}`;
        }
      } else {
        continuedKey = undefined;
      }
      continue;
    }

    const [, key, rawValue] = match;
    const quoted = rawValue.match(/^(["'])([\s\S]*)\1$/);
    metadata[key] = quoted ? quoted[2] : rawValue;
    continuedKey = rawValue === "" ? key : undefined;
  }

  return metadata;
}
