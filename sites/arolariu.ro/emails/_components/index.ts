/**
 * @fileoverview Public barrel for the shared email-chrome components.
 * @module emails/_components
 *
 * @remarks
 * Named exports only — no `export *`. If you add a new shared component,
 * add an explicit line here. Wildcard re-exports defeat editor "find
 * references" and risk re-exporting helper symbols that should stay
 * file-local (e.g., `layoutTranslator.ts` is intentionally not re-exported
 * here — `EmailLayout` is its only consumer).
 */

export {BRAND, EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";
export {BulletList} from "./BulletList";
export {DonutChart} from "./DonutChart";
export {EmailCard} from "./EmailCard";
export {EmailHrStyles, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "./EmailLayout";
export {KeyValueTable} from "./KeyValueTable";
export {MetricsGrid} from "./MetricsGrid";
