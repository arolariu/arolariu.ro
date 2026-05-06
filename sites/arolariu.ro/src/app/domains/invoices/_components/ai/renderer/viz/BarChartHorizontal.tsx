"use client";

import {Card, CardContent} from "@arolariu/components";

export type Bar = Readonly<{label: string; value: number; suffix?: string}>;

export function BarChartHorizontal({bars}: Readonly<{bars: ReadonlyArray<Bar>}>): React.JSX.Element {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <Card data-testid="viz-bar-chart-horizontal">
      <CardContent className="space-y-2 p-4">
        {bars.map((bar, i) => {
          const width = (bar.value / max) * 100;
          const valueLabel = `${bar.value}${bar.suffix ? " " + bar.suffix : ""}`;
          return (
            <div key={i} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
              <span className="truncate text-sm">{bar.label}</span>
              <div role="img" aria-label={`${bar.label}: ${valueLabel}`} className="h-3 rounded bg-muted">
                <div className="h-full rounded bg-primary" style={{width: `${width}%`}} />
              </div>
              <span className="text-sm tabular-nums">{valueLabel}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}