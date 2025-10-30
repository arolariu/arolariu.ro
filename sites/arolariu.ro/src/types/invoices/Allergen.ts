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

/** Represents the data transfer object payload for creating an allergen. */
export type CreateAllergenDtoPayload = Partial<Allergen>;

/** Represents the data transfer object payload for updating an allergen. */
export type UpdateAllergenDtoPayload = Partial<Allergen>;

/** Represents the data transfer object payload for deleting an allergen. */
export type DeleteAllergenDtoPayload = {
  /** The name of the allergen. */
  name: string;
};
