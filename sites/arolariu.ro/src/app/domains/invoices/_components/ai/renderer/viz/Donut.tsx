"use client";

import {Card, CardContent} from "@arolariu/components";

export type DonutSlice = Readonly<{label: string; value: number; color: string}>;

export function Donut({slices}: Readonly<{slices: ReadonlyArray<DonutSlice>}>): React.JSX.Element {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const radius = 50;
  const stroke = 16;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card data-testid="viz-donut">
      <CardContent className="grid grid-cols-2 gap-4 p-4">
        <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Spending breakdown by category">
          <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#e5e7eb" strokeWidth={stroke} />
          {slices.map((slice, i) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const seg = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += dash;
            return seg;
          })}
        </svg>
        <ul className="space-y-1 text-sm">
          {slices.map((slice, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded" style={{backgroundColor: slice.color}} />
              <span className="truncate">{slice.label}</span>
              <span className="ml-auto tabular-nums">{slice.value.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}