/**
 * @fileoverview Email-client-safe bullet list (no <ul>/<li> reliance).
 * @module emails/components/BulletList
 */

import {Text} from "@react-email/components";

import {EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Props = Readonly<{
  readonly items: readonly string[];
}>;

const styles = {
  item: {
    margin: "0 0 8px",
    fontSize: "14px",
    lineHeight: "20px",
    color: EMAIL_COLORS.ink,
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
} as const;

export function BulletList(props: Props) {
  const {items} = props;

  return items.map((item) => (
    <Text
      key={item}
      style={styles.item}>
      • {item}
    </Text>
  ));
}
