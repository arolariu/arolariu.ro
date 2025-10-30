/**
 * Represents an allergen from the invoice domain system.
 */
export type Allergen = {
  /** The name of the allergen. */
  name: string;

  /** A description of the allergen. */
  description: string;

  /** A URL to learn more about the allergen. */
  learnMoreAddress: string;
};
