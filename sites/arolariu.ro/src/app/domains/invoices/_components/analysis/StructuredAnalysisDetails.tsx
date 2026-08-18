"use client";

/**
 * @fileoverview Shared, evidence-first presentation for structured analysis output.
 * @module app/domains/invoices/_components/analysis/StructuredAnalysisDetails
 */

import {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  ClassificationOrigin,
  RecipeDifficulty,
  type AllergenAssessment,
  type AllergenCodeValue,
  type RecipeSuggestion,
  type StandardClassification,
} from "@/types/invoices";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbAlertTriangle} from "react-icons/tb";
import {formatClassificationConfidence, getClassificationRoot} from "../../_utils/classificationUtilities";
import styles from "./StructuredAnalysisDetails.module.scss";

const RECIPE_DIFFICULTY_KEYS = {
  [RecipeDifficulty.Easy]: "easy",
  [RecipeDifficulty.Medium]: "medium",
  [RecipeDifficulty.Hard]: "hard",
} as const;

type ClassificationProvenanceProps = Readonly<{
  /** Canonical classification to display, or null before classification. */
  classification: StandardClassification | null;
  /** Whether to omit the detailed hierarchy and evidence list. */
  compact?: boolean;
}>;

type AllergenAssessmentDetailsProps = Readonly<{
  /** Structured assessment to display, or null when it has not run. */
  assessment: AllergenAssessment | null;
  /** Whether to omit signal evidence while retaining the cautious state. */
  compact?: boolean;
}>;

/** Resolves a localized EU-14 allergen label without presenting a safety claim. */
export function AllergenCodeLabel({code}: Readonly<{code: AllergenCodeValue}>): React.JSX.Element | null {
  const t = useTranslations();
  switch (code) {
    case AllergenCode.CerealsContainingGluten:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.cerealsContainingGluten)}</>;
    case AllergenCode.Crustaceans:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.crustaceans)}</>;
    case AllergenCode.Eggs:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.eggs)}</>;
    case AllergenCode.Fish:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.fish)}</>;
    case AllergenCode.Peanuts:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.peanuts)}</>;
    case AllergenCode.Soybeans:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.soybeans)}</>;
    case AllergenCode.Milk:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.milk)}</>;
    case AllergenCode.Nuts:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.nuts)}</>;
    case AllergenCode.Celery:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.celery)}</>;
    case AllergenCode.Mustard:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.mustard)}</>;
    case AllergenCode.Sesame:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.sesame)}</>;
    case AllergenCode.SulphurDioxideAndSulphites:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.sulphurDioxideAndSulphites)}</>;
    case AllergenCode.Lupin:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.lupin)}</>;
    case AllergenCode.Molluscs:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.codes.molluscs)}</>;
    default:
      return null;
  }
}

function AllergenStatusLabel({
  status,
}: Readonly<{
  status: Exclude<AllergenAssessment["status"], typeof AllergenAssessmentStatus.Detected> | typeof AllergenAssessmentStatus.Detected;
}>): React.JSX.Element | null {
  const t = useTranslations();
  switch (status) {
    case AllergenAssessmentStatus.Detected:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.detected)}</>;
    case AllergenAssessmentStatus.NoSignals:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.noSignals)}</>;
    case AllergenAssessmentStatus.InsufficientData:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.insufficientData)}</>;
    default:
      return null;
  }
}

function AllergenEvidenceLevelLabel({
  evidenceLevel,
}: Readonly<{evidenceLevel: AllergenAssessment["signals"][number]["evidenceLevel"]}>): React.JSX.Element | null {
  const t = useTranslations();
  switch (evidenceLevel) {
    case AllergenEvidenceLevel.Explicit:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.explicit)}</>;
    case AllergenEvidenceLevel.Inferred:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.inferred)}</>;
    case AllergenEvidenceLevel.Precautionary:
      return <>{t((m) => m.cards.invoices.analysisResults.allergens.precautionary)}</>;
    default:
      return null;
  }
}

/** Renders a cautious assessment state badge without treating empty evidence as safe. */
export function AllergenAssessmentStatusBadge({assessment}: Readonly<{assessment: AllergenAssessment | null}>): React.JSX.Element {
  const t = useTranslations();
  if (assessment === null) {
    return <Badge variant='outline'>{t((m) => m.cards.invoices.analysisResults.allergens.notAssessed)}</Badge>;
  }

  return (
    <Badge
      variant={assessment.status === AllergenAssessmentStatus.Detected ? "destructive" : "outline"}
      className={styles["warningBadge"]}>
      {assessment.status === AllergenAssessmentStatus.Detected ? <TbAlertTriangle aria-hidden /> : null}
      <AllergenStatusLabel status={assessment.status} />
    </Badge>
  );
}

/** Renders each explicit allergen state and, when detected, its EU-14 evidence. */
export function AllergenAssessmentDetails({assessment, compact = false}: AllergenAssessmentDetailsProps): React.JSX.Element {
  const t = useTranslations();
  if (assessment === null) {
    return <p className={styles["notAssessed"]}>{t((m) => m.cards.invoices.analysisResults.allergens.notAssessed)}</p>;
  }

  if (assessment.status !== AllergenAssessmentStatus.Detected || compact) {
    return (
      <div className={styles["assessment"]}>
        <AllergenAssessmentStatusBadge assessment={assessment} />
      </div>
    );
  }

  return (
    <div className={styles["assessment"]}>
      <AllergenAssessmentStatusBadge assessment={assessment} />
      <ul className={styles["signals"]}>
        {assessment.signals.map((signal) => (
          <li
            key={`${signal.code}-${signal.evidenceLevel}`}
            className={styles["signal"]}>
            <div className={styles["signalHeader"]}>
              <Badge variant='destructive'>
                <TbAlertTriangle aria-hidden />
                <AllergenCodeLabel code={signal.code} />
              </Badge>
              <span className={styles["meta"]}>
                <AllergenEvidenceLevelLabel evidenceLevel={signal.evidenceLevel} /> ·{" "}
                {t((m) => m.cards.invoices.analysisResults.allergens.confidence, {
                  confidence: String(Math.round(signal.confidence * 100)),
                })}
              </span>
            </div>
            <ul className={styles["evidence"]}>
              {signal.evidence.map((evidence) => (
                <li
                  key={`${evidence.source}-${evidence.value}`}
                  className={styles["evidenceItem"]}>
                  {evidence.source}: {evidence.value}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renders canonical classification label, code, hierarchy, origin, confidence, and evidence. */
export function ClassificationProvenance({classification, compact = false}: ClassificationProvenanceProps): React.JSX.Element {
  const t = useTranslations();
  if (classification === null) {
    return <span className={styles["unclassified"]}>{t((m) => m.cards.invoices.analysisResults.unclassified)}</span>;
  }

  const root = getClassificationRoot(classification);
  const confidence = formatClassificationConfidence(classification);

  return (
    <div className={styles["classification"]}>
      <div className={styles["summary"]}>
        <strong>{classification.officialLabel}</strong>
        <code>{classification.code}</code>
        <Badge variant='outline'>
          {classification.origin === ClassificationOrigin.Manual
            ? t((m) => m.cards.invoices.analysisResults.classification.manualOrigin)
            : t((m) => m.cards.invoices.analysisResults.classification.analysisOrigin)}
        </Badge>
      </div>
      {root === null ? null : (
        <span className={styles["meta"]}>
          {t((m) => m.cards.invoices.analysisResults.classification.root, {
            code: root.code,
            label: root.officialLabel,
          })}
        </span>
      )}
      {confidence === null ? null : (
        <span className={styles["meta"]}>{t((m) => m.cards.invoices.analysisResults.classification.confidence, {confidence})}</span>
      )}
      {compact ? null : (
        <>
          <ol className={styles["hierarchy"]}>
            {classification.hierarchy.map((node) => (
              <li key={`${node.level}-${node.code}`}>
                {node.officialLabel} ({node.code})
              </li>
            ))}
          </ol>
          {classification.origin === ClassificationOrigin.Analysis && classification.evidence.length > 0 ? (
            <details>
              <summary>{t((m) => m.cards.invoices.analysisResults.classification.evidence)}</summary>
              <ul className={styles["evidence"]}>
                {classification.evidence.map((evidence) => (
                  <li key={`${evidence.source}-${evidence.value}`}>
                    {evidence.source}: {evidence.value}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Renders complete, ordered recipe output without inventing ingredients or preparation data. */
export function RecipeSuggestionDetails({recipe}: Readonly<{recipe: RecipeSuggestion}>): React.JSX.Element {
  const t = useTranslations();
  return (
    <div className={styles["recipe"]}>
      <div className={styles["recipeMeta"]}>
        <Badge>{t((m) => m.cards.invoices.analysisResults.recipes.difficulty[RECIPE_DIFFICULTY_KEYS[recipe.difficulty]])}</Badge>
        <span>{t((m) => m.cards.invoices.analysisResults.recipes.servings, {count: String(recipe.servings)})}</span>
        <span>{t((m) => m.cards.invoices.analysisResults.recipes.preparationMinutes, {minutes: String(recipe.preparationMinutes)})}</span>
        <span>{t((m) => m.cards.invoices.analysisResults.recipes.cookingMinutes, {minutes: String(recipe.cookingMinutes)})}</span>
        <span>{t((m) => m.cards.invoices.analysisResults.recipes.totalMinutes, {minutes: String(recipe.totalMinutes)})}</span>
      </div>
      <RecipeIngredientSection
        title={t((m) => m.cards.invoices.analysisResults.recipes.purchasedIngredients)}
        ingredients={recipe.purchasedIngredients}
      />
      <RecipeIngredientSection
        title={t((m) => m.cards.invoices.analysisResults.recipes.pantryStaples)}
        ingredients={recipe.assumedPantryStaples}
      />
      <RecipeIngredientSection
        title={t((m) => m.cards.invoices.analysisResults.recipes.missingOptionalIngredients)}
        ingredients={recipe.missingOptionalIngredients}
      />
      <section className={styles["recipeSection"]}>
        <h4 className={styles["recipeTitle"]}>{t((m) => m.cards.invoices.analysisResults.recipes.steps)}</h4>
        <ol className={styles["recipeList"]}>
          {recipe.steps.map((step) => (
            <li key={step.sequence}>
              {step.instruction}
              {step.notes === null ? null : ` (${step.notes})`}
            </li>
          ))}
        </ol>
      </section>
      {recipe.allergenWarnings.length === 0 ? null : (
        <section className={styles["recipeSection"]}>
          <h4 className={styles["recipeTitle"]}>{t((m) => m.cards.invoices.analysisResults.recipes.warnings)}</h4>
          <ul className={styles["recipeList"]}>
            {recipe.allergenWarnings.map((warning) => (
              <li key={warning}>
                <TbAlertTriangle aria-hidden /> <AllergenCodeLabel code={warning} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RecipeIngredientSection({
  title,
  ingredients,
}: Readonly<{title: string; ingredients: RecipeSuggestion["purchasedIngredients"]}>): React.JSX.Element {
  return (
    <section className={styles["recipeSection"]}>
      <h4 className={styles["recipeTitle"]}>{title}</h4>
      <ul className={styles["recipeList"]}>
        {ingredients.map((ingredient) => (
          <li key={`${ingredient.name}-${ingredient.quantity}`}>
            {ingredient.name} — {ingredient.quantity}
            {ingredient.preparation === null ? null : ` (${ingredient.preparation})`}
          </li>
        ))}
      </ul>
    </section>
  );
}
