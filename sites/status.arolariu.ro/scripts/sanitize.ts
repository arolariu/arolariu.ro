const URL_PATTERN = /[A-Za-z][+\-.\w]*:\/\/\S+/g;
const PASSWORD_PATTERN = /password=\S+/gi;
const KEY_PATTERN = /key=\S+/gi;
const MAX_LEN = 200;

export function sanitizeDescription(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  let out = input
    .replace(URL_PATTERN, "")
    .replace(PASSWORD_PATTERN, "")
    .replace(KEY_PATTERN, "");
  if (out.length > MAX_LEN) {
    out = `${out.slice(0, MAX_LEN)}…`;
  }
  return out;
}
