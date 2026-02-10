/**
 * @fileoverview Email-safe donut/pie chart image block (renders as <img> with text fallback).
 * @module emails/components/DonutChart
 */

import {Img, Section, Text} from "@react-email/components";

import {EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Datum = Readonly<{
  readonly label: string;
  readonly value: number;
}>;

type Props = Readonly<{
  readonly title: string;
  readonly data: readonly Datum[];

  /** Optional pre-rendered chart image URL (preferred for privacy/consistency). */
  readonly chartImageUrl?: string;

  /** Accessible alt text for the chart image. */
  readonly alt: string;
}>;

type QuickChartConfig = Readonly<{
  readonly type: "doughnut";
  readonly data: Readonly<{
    readonly labels: readonly string[];
    readonly datasets: ReadonlyArray<Readonly<{readonly data: readonly number[]}>>;
  }>;
  readonly options: Readonly<{
    readonly legend: Readonly<{readonly display: boolean; readonly position: "bottom"}>;
    readonly tooltips: Readonly<{readonly enabled: boolean}>;
    readonly cutoutPercentage: number;
  }>;
}>;

const styles = {
  wrap: {
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "10px",
    backgroundColor: EMAIL_COLORS.background,
    padding: "14px 14px",
    margin: "0 0 14px",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: "700",
    color: EMAIL_COLORS.ink,
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
  image: {
    display: "block",
    width: "100%",
    maxWidth: "536px",
    height: "auto",
    borderRadius: "10px",
    border: `1px solid ${EMAIL_COLORS.border}`,
    backgroundColor: EMAIL_COLORS.cardBackground,
  },
  note: {
    margin: "10px 0 0",
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
} as const;

function buildQuickChartUrl(data: readonly Datum[]): string {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);

  const config: QuickChartConfig = {
    type: "doughnut",
    data: {
      labels,
      datasets: [{data: values}],
    },
    options: {
      legend: {display: true, position: "bottom"},
      tooltips: {enabled: true},
      cutoutPercentage: 55,
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&w=520&h=300&backgroundColor=white&format=png`;
}

export function DonutChart(props: Props) {
  const {title, data, chartImageUrl, alt} = props;

  const nonEmpty = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
  if (nonEmpty.length === 0) {
    return null;
  }

  const src = chartImageUrl ?? buildQuickChartUrl(nonEmpty);

  return (
    <Section style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Img
        src={src}
        alt={alt}
        style={styles.image}
      />
      {chartImageUrl ? null : (
        <Text style={styles.note}>
          Chart is generated as an image. If images are blocked in your email client, refer to the breakdown below.
        </Text>
      )}
    </Section>
  );
}
