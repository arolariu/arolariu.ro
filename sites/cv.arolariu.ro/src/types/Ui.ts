/**
 * UI string catalog — labels, button text, status messages, format names.
 * Every `ui` access in components reads from this catalog so copy lives
 * in one place.
 */
export type Ui = Readonly<{
  navigation: Readonly<Record<string, string>>;
  buttons: Readonly<Record<string, string>>;
  labels: Readonly<Record<string, string>>;
  placeholders: Readonly<Record<string, string>>;
  status: Readonly<Record<string, string>>;
  formats: Readonly<Record<string, string>>;
}>;
