<script lang="ts">
  import {cx} from "@/lib/utils";
  import Icon, {type IconName} from "@/presentation/Icon.svelte";
  import styles from "./ActionButton.module.scss";

  let {
    onClick = () => {},
    label = "",
    icon = undefined,
    loading = false,
    disabled = false,
    variant = "default",
    back = false,
    class: extra = "",
  }: {
    onClick?: () => void;
    label?: string;
    icon?: IconName;
    loading?: boolean;
    disabled?: boolean;
    variant?: "default" | "inverse" | "text" | "text-inverse";
    back?: boolean;
    class?: string;
  } = $props();

  const variantClasses: Record<string, string> = {
    default: styles.default,
    inverse: styles.inverse,
    text: styles.text,
    "text-inverse": styles.textInverse,
  };
</script>

<button
  type="button"
  onclick={onClick}
  disabled={disabled || loading}
  class={cx(styles.button, variantClasses[variant] ?? variantClasses["default"], extra, styles.block)}>
  {#if loading}
    <svg
      class={styles.spinner}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true">
      <circle
        class={styles.spinnerTrack}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4" />
      <path
        class={styles.spinnerFill}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  {:else if back && !icon}
    <Icon
      name="arrow-left"
      class={styles.iconMedium} />
  {:else if icon}
    <Icon
      name={icon}
      class={styles.iconSmall} />
  {/if}
  <span class={styles.label}>{label}</span>
</button>
