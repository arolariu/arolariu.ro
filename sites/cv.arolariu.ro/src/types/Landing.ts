/**
 * Landing-page strings + help dialog content.
 */
export type Landing = Readonly<{
  title: string;
  subtitle: string;
  footer: string;
  panels: Readonly<{
    help: Readonly<{
      title: string;
      description: string;
    }>;
  }>;
}>;

export type Help = Readonly<{
  title: string;
  description: string;
}>;
