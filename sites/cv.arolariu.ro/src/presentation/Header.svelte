<script lang="ts">
  import {goto} from "$app/navigation";
  import ThemeToggle from "../components/ThemeToggle.svelte";
  import {ui} from "../data";
  import {cx} from "@/lib/utils";
  import ActionButton from "@/presentation/ActionButton.svelte";
  import styles from "./Header.module.scss";

  export type ActionConfig = {
    icon: "print" | "download" | "copy";
    label: string;
    loading: boolean;
    disabled: boolean;
    onClick: () => void;
  };

  interface Props {
    variant?: "default" | "inverse";
    actions?: () => any; // render function for actions area
    sticky?: boolean; // stick to top
    showNavLinks?: boolean; // show section nav links (non-minimal)
    class?: string; // extra classes
    actionsConfig?: ActionConfig[];
  }

  let {
    variant = "default",
    actions = undefined,
    sticky = true,
    showNavLinks = true,
    actionsConfig = undefined,
    class: extra = "",
  }: Props = $props();

  function goBack(): void {
    goto("/");
  }

  const headerClasses = $derived(cx(styles.header, sticky && styles.sticky, styles[variant], extra));
  const titleClasses = $derived(cx(styles.title, variant === "inverse" ? styles.titleInverse : styles.titleDefault));
</script>

<header class={headerClasses}>
  <div class={styles.inner}>
    <div class={styles.content}>
      <div class={styles.brandGroup}>
        <ActionButton
          back
          label={ui.navigation.backToMenu}
          onClick={goBack}
          variant={variant === "inverse" ? "text-inverse" : "text"} />
        <div class={styles.titleWrap}>
          <h1 class={titleClasses}>Alexandru-Razvan Olariu</h1>
        </div>
      </div>
      <div class={styles.actions}>
        {#if showNavLinks}
          <nav class={styles.nav}>
            <a
              href="#about"
              class={styles.navLink}>{ui.navigation.about}</a>
            <a
              href="#experience"
              class={styles.navLink}>{ui.navigation.experience}</a>
            <a
              href="#skills"
              class={styles.navLink}>{ui.navigation.skills}</a>
            <a
              href="#contact"
              class={styles.navLink}>{ui.navigation.contact}</a>
          </nav>
        {/if}
        <ThemeToggle />
        {#if actionsConfig}
          <div class={styles.actionButtons}>
            {#each actionsConfig as act}
              <ActionButton
                icon={act.icon}
                label={act.label}
                loading={act.loading}
                disabled={act.disabled}
                onClick={act.onClick}
                variant={variant === "inverse" ? "inverse" : "default"} />
            {/each}
          </div>
        {/if}
        {#if actions && !actionsConfig}
          <div class={styles.actionButtons}>{@render actions()}</div>
        {/if}
      </div>
    </div>
  </div>
</header>
