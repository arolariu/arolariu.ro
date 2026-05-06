"use client";

import {Card, CardContent} from "@arolariu/components";

export type ComparisonPairProps = Readonly<{
  labelA: string;
  valueA: string;
  labelB: string;
  valueB: string;
  delta: string;
  direction: "more" | "less" | "no-change" | "n/a";
}>;

export function ComparisonPair({labelA, valueA, labelB, valueB, delta, direction}: ComparisonPairProps): React.JSX.Element {
  const indicator = direction === "more" ? "▲" : direction === "less" ? "▼" : "·";
  const tone = direction === "more" ? "text-red-500" : direction === "less" ? "text-green-500" : "text-muted-foreground";
  return (
    <Card data-testid="viz-comparison-pair">
      <CardContent className="grid grid-cols-3 gap-4 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{labelA}</div>
          <div className="text-2xl font-semibold tabular-nums">{valueA}</div>
        </div>
        <div className={`flex flex-col items-center justify-center ${tone}`} role="img" aria-label={`${direction} ${delta}`}>
          <div className="text-2xl">{indicator}</div>
          <div className="text-sm tabular-nums">{delta}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{labelB}</div>
          <div className="text-2xl font-semibold tabular-nums">{valueB}</div>
        </div>
      </CardContent>
    </Card>
  );
}