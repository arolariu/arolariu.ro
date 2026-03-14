import {describe} from "vitest";

import {Badge} from "../components/ui/badge";
import {Card} from "../components/ui/card";
import {CardSkeleton} from "../components/ui/card-skeleton";
import {CopyButton} from "../components/ui/copy-button";
import {ErrorBoundary} from "../components/ui/error-boundary";
import {FocusScope} from "../components/ui/focus-scope";
import {FormSkeleton} from "../components/ui/form-skeleton";
import {ListSkeleton} from "../components/ui/list-skeleton";
import {Skeleton} from "../components/ui/skeleton";
import {Spinner} from "../components/ui/spinner";
import {Stepper} from "../components/ui/stepper";
import {TableSkeleton} from "../components/ui/table-skeleton";
import {Timeline, TimelineContent, TimelineDot, TimelineItem} from "../components/ui/timeline";
import {VisuallyHidden} from "../components/ui/visually-hidden";
import {isConformant} from "./is-conformant";

describe("Component conformance", () => {
  isConformant({displayName: "Badge", Component: Badge, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "Card", Component: Card, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "Skeleton", Component: Skeleton, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "Spinner", Component: Spinner, testRef: true, refType: SVGSVGElement});
  isConformant({
    displayName: "VisuallyHidden",
    Component: VisuallyHidden,
    testRef: true,
    refType: HTMLSpanElement,
    requiredProps: {children: "text"},
  });
  isConformant({
    displayName: "Stepper",
    Component: Stepper,
    testRef: true,
    refType: HTMLDivElement,
    requiredProps: {steps: ["One", "Two"], activeStep: 0},
  });
  isConformant({displayName: "Timeline", Component: Timeline, testRef: true, refType: HTMLDivElement, requiredProps: {children: null}});
  isConformant({
    displayName: "TimelineItem",
    Component: TimelineItem,
    testRef: true,
    refType: HTMLDivElement,
    requiredProps: {children: null},
  });
  isConformant({displayName: "TimelineDot", Component: TimelineDot, testRef: true, refType: HTMLDivElement});
  isConformant({
    displayName: "TimelineContent",
    Component: TimelineContent,
    testRef: true,
    refType: HTMLDivElement,
    requiredProps: {children: null},
  });
  isConformant({
    displayName: "CopyButton",
    Component: CopyButton,
    testRef: true,
    refType: HTMLButtonElement,
    requiredProps: {value: "test"},
  });
  isConformant({displayName: "CardSkeleton", Component: CardSkeleton, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "TableSkeleton", Component: TableSkeleton, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "FormSkeleton", Component: FormSkeleton, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "ListSkeleton", Component: ListSkeleton, testRef: true, refType: HTMLDivElement});
  isConformant({displayName: "FocusScope", Component: FocusScope, testRef: true, refType: HTMLDivElement, requiredProps: {children: null}});
  isConformant({
    displayName: "ErrorBoundary",
    Component: ErrorBoundary,
    testClassName: false,
    testRef: false,
    requiredProps: {children: null},
  });
});
