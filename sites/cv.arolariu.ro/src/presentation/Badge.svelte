<script lang="ts">
  /**
   * Badge component for skill tokens, statuses, tags.
   *
   * Props:
   *  - text: displayed label
   *  - color: semantic accent key
   *  - variant: visual style
   *  - size: scale (sm | md)
   *  - title?: optional title / tooltip
   */
  import {cx} from "@/lib/utils";
  import styles from "./Badge.module.scss";

  type Color = "blue" | "green" | "purple" | "pink" | "orange" | "gray";
  type Variant = "solid" | "soft" | "outline";
  type Size = "sm" | "md";

  interface Props {
    text: string;
    color?: Color;
    variant?: Variant;
    size?: Size;
    title?: string;
    class?: string;
    style?: string;
  }

  let {text, color = "blue", variant = "soft", size = "md", title = "", style = "", class: extraClass = ""}: Props = $props();

  const sizeMap: Record<Size, string> = {
    sm: styles.sm,
    md: styles.md,
  };

  const palettes: Record<Color, {solid: string; soft: string; outline: string}> = {
    blue: {
      solid: styles.blueSolid,
      soft: styles.blueSoft,
      outline: styles.blueOutline,
    },
    green: {
      solid: styles.greenSolid,
      soft: styles.greenSoft,
      outline: styles.greenOutline,
    },
    purple: {
      solid: styles.purpleSolid,
      soft: styles.purpleSoft,
      outline: styles.purpleOutline,
    },
    pink: {
      solid: styles.pinkSolid,
      soft: styles.pinkSoft,
      outline: styles.pinkOutline,
    },
    orange: {
      solid: styles.orangeSolid,
      soft: styles.orangeSoft,
      outline: styles.orangeOutline,
    },
    gray: {
      solid: styles.graySolid,
      soft: styles.graySoft,
      outline: styles.grayOutline,
    },
  };

  const classes = $derived(cx(styles.badge, sizeMap[size], palettes[color][variant], extraClass));
</script>

<span
  class={classes}
  {title}
  aria-label={title || text}
  {style}>{text}</span>
