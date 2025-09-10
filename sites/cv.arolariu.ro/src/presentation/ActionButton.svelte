<script lang="ts">
  import Icon from "@/presentation/Icon.svelte";

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
    icon?: string; // Icon component will validate internally; kept broad here
    loading?: boolean;
    disabled?: boolean;
    variant?: "default" | "inverse" | "text" | "text-inverse";
    back?: boolean;
    class?: string;
  } = $props();

  const base =
    "inline-flex items-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";
  const variantClasses: Record<string, string> = {
    default:
      "px-4 py-2 rounded-md text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500",
    inverse: "px-4 py-2 rounded-md text-sm bg-white/10 text-white hover:bg-white/20 focus:ring-white/30",
    text: "px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:ring-blue-500 rounded",
    "text-inverse": "px-2 py-1 text-sm text-white hover:text-gray-200 focus:ring-white/40 rounded",
  };
  const spinner = `<svg class=\"animate-spin w-4 h-4\" fill=\"none\" viewBox=\"0 0 24 24\"><circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\"/><path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"/></svg>`;
</script>

<button
  type="button"
  onclick={onClick}
  disabled={disabled || loading}
  class={`${base} ${variantClasses[variant] ?? variantClasses["default"]} ${extra} block`}>
  {#if loading}
    {@html spinner}
  {:else if back && !icon}
    <Icon
      name="arrow-left"
      class="w-5 h-5 inline" />
  {:else if icon}
    <Icon
      name={icon as any}
      class="w-4 h-4 inline" />
  {/if}
  <span class="whitespace-nowrap">{label}</span>
</button>
