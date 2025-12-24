/**
 * @fileoverview Email-safe card wrapper for grouping content sections.
 * @module emails/components/EmailCard
 */

import {Section, Text} from "@react-email/components";
import type {ReactNode} from "react";

import {EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Props = Readonly<{
  readonly title?: string;
  readonly children: ReactNode;
}>;

const styles = {
  card: {
    backgroundColor: EMAIL_COLORS.background,
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "10px",
    padding: "16px",
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
} as const;

export function EmailCard(props: Props) {
  const {title, children} = props;

  return (
    <Section style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </Section>
  );
}
