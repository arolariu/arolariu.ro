/**
 * @fileoverview Simple email-safe metric grid (2-up cards using tables).
 * @module emails/components/MetricsGrid
 */

import {Column, Row, Section, Text} from "@react-email/components";

import {EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Metric = Readonly<{
  readonly label: string;
  readonly value: string;
}>;

type Props = Readonly<{
  readonly metrics: readonly Metric[];
}>;

const styles = {
  row: {
    width: "100%",
    margin: "0 0 10px",
  },
  cell: {
    padding: "0 6px 10px 0",
    verticalAlign: "top" as const,
  },
  cellRight: {
    padding: "0 0 10px 6px",
    verticalAlign: "top" as const,
  },
  card: {
    backgroundColor: EMAIL_COLORS.background,
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "10px",
    padding: "12px",
  },
  label: {
    margin: "0 0 6px",
    fontSize: "12px",
    lineHeight: "16px",
    color: EMAIL_COLORS.muted,
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
  value: {
    margin: "0",
    fontSize: "18px",
    lineHeight: "22px",
    fontWeight: "700",
    color: EMAIL_COLORS.ink,
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
} as const;

function chunkMetrics(metrics: readonly Metric[]): readonly (readonly [Metric | null, Metric | null])[] {
  const rows: Array<readonly [Metric | null, Metric | null]> = [];

  for (let index = 0; index < metrics.length; index += 2) {
    rows.push([metrics[index] ?? null, metrics[index + 1] ?? null]);
  }

  return rows;
}

export function MetricsGrid(props: Props) {
  const {metrics} = props;
  const rows = chunkMetrics(metrics);

  return rows.map(([left, right]) => (
    <Section
      key={`${left?.label ?? "empty"}|${right?.label ?? "empty"}`}
      style={styles.row}>
      <Row>
        <Column style={styles.cell}>
          {left ? (
            <Section style={styles.card}>
              <Text style={styles.label}>{left.label}</Text>
              <Text style={styles.value}>{left.value}</Text>
            </Section>
          ) : null}
        </Column>
        <Column style={styles.cellRight}>
          {right ? (
            <Section style={styles.card}>
              <Text style={styles.label}>{right.label}</Text>
              <Text style={styles.value}>{right.value}</Text>
            </Section>
          ) : null}
        </Column>
      </Row>
    </Section>
  ));
}
