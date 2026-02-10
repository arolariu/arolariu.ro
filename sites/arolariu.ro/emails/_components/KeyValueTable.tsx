/**
 * @fileoverview Table-friendly key/value block for email details.
 * @module emails/components/KeyValueTable
 */

import {Column, Row, Section, Text} from "@react-email/components";

import {EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Item = Readonly<{
  readonly label: string;
  readonly value: string;
}>;

type Props = Readonly<{
  readonly title?: string;
  readonly items: readonly Item[];
}>;

const styles = {
  wrap: {
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "10px",
    backgroundColor: EMAIL_COLORS.background,
    padding: "14px 14px",
    margin: "18px 0",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "14px",
    lineHeight: "20px",
    fontWeight: "700",
    color: EMAIL_COLORS.ink,
  },
  row: {
    padding: "2px 0",
  },
  label: {
    margin: "0",
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
  },
  value: {
    margin: "0",
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: "600",
    color: EMAIL_COLORS.ink,
    fontFamily: EMAIL_TYPOGRAPHY.monoFontFamily,
    wordBreak: "break-word" as const,
  },
} as const;

export function KeyValueTable(props: Props) {
  const {title, items} = props;

  return (
    <Section style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      {items.map((item) => (
        <Row
          key={item.label}
          style={styles.row}>
          <Column style={{width: "40%", paddingRight: "8px"}}>
            <Text style={styles.label}>{item.label}</Text>
          </Column>
          <Column style={{width: "60%"}}>
            <Text style={styles.value}>{item.value}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}
