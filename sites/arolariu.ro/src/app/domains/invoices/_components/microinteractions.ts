/**
 * Micro-interactions module - Exports all animation components for invoice pages.
 *
 * @remarks
 * This module provides reusable animation components for creating delightful
 * user experiences across the invoice management system.
 *
 * @example
 * ```tsx
 * import {AnimatedCounter, FadeIn, StaggerContainer, StaggerItem} from "./_components/microinteractions";
 *
 * <FadeIn>
 *   <StaggerContainer>
 *     <StaggerItem>
 *       <AnimatedCounter value={1250} prefix="$" />
 *     </StaggerItem>
 *   </StaggerContainer>
 * </FadeIn>
 * ```
 */

export {AnimatedCounter} from "./AnimatedCounter";
export {FadeIn} from "./FadeIn";
export {StaggerContainer, StaggerItem} from "./StaggerContainer";
