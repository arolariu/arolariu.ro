/**
 * Parses top-level scalar YAML frontmatter values used by Copilot assets.
 * @param {string} source - Markdown source.
 * @returns {Record<string, string>} Parsed scalar metadata.
 */
export function parseFrontmatter(source) {
	const frontmatter = source.match(
		/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
	)?.[1];
	if (!frontmatter) return {};

	const metadata = {};
	for (const line of frontmatter.split(/\r?\n/)) {
		const match = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
		if (!match) continue;

		const [, key, rawValue] = match;
		const quoted = rawValue.match(/^(["'])([\s\S]*)\1$/);
		metadata[key] = quoted ? quoted[2] : rawValue;
	}

	return metadata;
}
