const URL_PATTERN = /[A-Za-z][+\-.\w]*:\/\/\S+/g;
const SECRET_PATTERNS: readonly RegExp[] = [
  /password=\S+/gi,
  /key=\S+/gi,
  /token=\S+/gi,
  /secret=\S+/gi,
  /\bbearer\s+\S+/gi,
  /\bauthorization:\s*\S+/gi,
];
const MAX_LEN = 200;

export function sanitizeDescription(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  let out = input.replace(URL_PATTERN, "");
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "");
  }
  if (out.length > MAX_LEN) {
    out = `${out.slice(0, MAX_LEN)}…`;
  }
  return out;
}
