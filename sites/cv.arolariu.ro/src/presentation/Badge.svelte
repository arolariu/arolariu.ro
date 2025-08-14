<!-- @format -->
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

  const base =
    "inline-flex items-center font-medium rounded-full select-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-transparent ring-blue-500/50";

  const sizeMap: Record<Size, string> = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };

  const palettes: Record<Color, {solid: string; soft: string; outline: string}> = {
    blue: {
      solid: "bg-blue-600 text-white hover:bg-blue-500",
      soft: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20",
      outline: "text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-500/10",
    },
    green: {
      solid: "bg-green-600 text-white hover:bg-green-500",
      soft: "bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-inset ring-green-500/20",
      outline: "text-green-600 dark:text-green-400 border border-green-500/40 hover:bg-green-500/10",
    },
    purple: {
      solid: "bg-purple-600 text-white hover:bg-purple-500",
      soft: "bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-inset ring-purple-500/20",
      outline: "text-purple-600 dark:text-purple-400 border border-purple-500/40 hover:bg-purple-500/10",
    },
    pink: {
      solid: "bg-pink-600 text-white hover:bg-pink-500",
      soft: "bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-inset ring-pink-500/20",
      outline: "text-pink-600 dark:text-pink-400 border border-pink-500/40 hover:bg-pink-500/10",
    },
    orange: {
      solid: "bg-orange-500 text-white hover:bg-orange-400",
      soft: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-inset ring-orange-500/20",
      outline: "text-orange-600 dark:text-orange-400 border border-orange-500/40 hover:bg-orange-500/10",
    },
    gray: {
      solid: "bg-gray-700 text-white hover:bg-gray-600",
      soft: "bg-gray-500/10 text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-500/20",
      outline: "text-gray-700 dark:text-gray-300 border border-gray-400/40 dark:border-gray-600 hover:bg-gray-500/10",
    },
  };

  const classes = `${base} ${sizeMap[size]} ${palettes[color][variant]} ${extraClass}`;
</script>

<span
  class={classes}
  {title}
  aria-label={title || text}
  {style}>{text}</span>
