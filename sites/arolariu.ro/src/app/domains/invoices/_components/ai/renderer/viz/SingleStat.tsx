"use client";

import {Card, CardContent} from "@arolariu/components";

export function SingleStat({label, value}: Readonly<{label: string; value: string}>): React.JSX.Element {
  return (
    <Card data-testid="viz-single-stat">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold tabular-nums" role="img" aria-label={`${label}: ${value}`}>{value}</div>
      </CardContent>
    </Card>
  );
}