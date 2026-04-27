<script lang="ts">
  import {goto} from "$app/navigation";
  import {cx} from "@/lib/utils";
  import {useTheme} from "@/hooks/useTheme.svelte";
  import {onMount} from "svelte";
  import styles from "./CommandPalette.module.scss";

  const theme = useTheme();
  const isDark = $derived(theme.current === "dark");

  type CommandAction = {
    id: string;
    label: string;
    description?: string;
    icon: string;
    category: "navigation" | "action" | "contact";
    keywords?: string[];
    action: () => void;
  };

  let isOpen = $state(false);
  let searchQuery = $state("");
  let selectedIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);

  // Define all available commands
  const commands = $derived((): CommandAction[] => [
    // Navigation
    {
      id: "nav-home",
      label: "Go to Home",
      description: "Return to the landing page",
      icon: "home",
      category: "navigation",
      keywords: ["home", "landing", "start", "main"],
      action: () => goto("/"),
    },
    {
      id: "nav-human",
      label: "View CV",
      description: "Interactive human-readable CV",
      icon: "user",
      category: "navigation",
      keywords: ["cv", "resume", "human", "read", "view"],
      action: () => goto("/human"),
    },
    {
      id: "nav-pdf",
      label: "View PDF",
      description: "PDF version of the CV",
      icon: "file",
      category: "navigation",
      keywords: ["pdf", "document", "print", "download"],
      action: () => goto("/pdf"),
    },
    {
      id: "nav-json",
      label: "View JSON",
      description: "Machine-readable JSON format",
      icon: "code",
      category: "navigation",
      keywords: ["json", "data", "api", "developer", "code"],
      action: () => goto("/json"),
    },
    {
      id: "nav-about",
      label: "About Section",
      description: "Jump to the about section",
      icon: "info",
      category: "navigation",
      keywords: ["about", "bio", "biography", "introduction"],
      action: () => {
        goto("/human#about");
        close();
      },
    },
    {
      id: "nav-skills",
      label: "Skills Section",
      description: "View technical skills",
      icon: "star",
      category: "navigation",
      keywords: ["skills", "abilities", "expertise", "technologies"],
      action: () => {
        goto("/human#skills");
        close();
      },
    },
    {
      id: "nav-experience",
      label: "Experience Section",
      description: "View work history",
      icon: "briefcase",
      category: "navigation",
      keywords: ["experience", "work", "jobs", "career", "history"],
      action: () => {
        goto("/human#experience");
        close();
      },
    },
    {
      id: "nav-contact",
      label: "Contact Section",
      description: "Get in touch",
      icon: "mail",
      category: "navigation",
      keywords: ["contact", "email", "reach", "message"],
      action: () => {
        goto("/human#contact");
        close();
      },
    },
    // Actions
    {
      id: "action-theme",
      label: "Toggle Theme",
      description: `Switch to ${isDark ? "light" : "dark"} mode`,
      icon: isDark ? "sun" : "moon",
      category: "action",
      keywords: ["theme", "dark", "light", "mode", "toggle", "color"],
      action: () => {
        theme.toggle();
        close();
      },
    },
    {
      id: "action-download-pdf",
      label: "Download PDF",
      description: "Download CV as PDF file",
      icon: "download",
      category: "action",
      keywords: ["download", "pdf", "save", "export"],
      action: () => {
        const link = document.createElement("a");
        link.href = "/cv.pdf";
        link.download = "Alexandru_Olariu_CV.pdf";
        link.click();
        close();
      },
    },
    {
      id: "action-copy-json",
      label: "Copy JSON to Clipboard",
      description: "Copy CV data as JSON",
      icon: "clipboard",
      category: "action",
      keywords: ["copy", "json", "clipboard", "data"],
      action: async () => {
        try {
          const res = await fetch("/rest/json");
          const data = await res.json();
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          close();
        } catch {
          console.error("Failed to copy JSON");
        }
      },
    },
    {
      id: "action-print",
      label: "Print Page",
      description: "Print the current page",
      icon: "printer",
      category: "action",
      keywords: ["print", "paper", "hard copy"],
      action: () => {
        window.print();
        close();
      },
    },
    // Contact
    {
      id: "contact-email",
      label: "Send Email",
      description: "admin@arolariu.ro",
      icon: "mail",
      category: "contact",
      keywords: ["email", "mail", "contact", "message"],
      action: () => {
        window.location.href = "mailto:admin@arolariu.ro";
        close();
      },
    },
    {
      id: "contact-linkedin",
      label: "Open LinkedIn",
      description: "View LinkedIn profile",
      icon: "linkedin",
      category: "contact",
      keywords: ["linkedin", "social", "profile", "network"],
      action: () => {
        window.open("https://www.linkedin.com/in/olariu-alexandru/", "_blank");
        close();
      },
    },
    {
      id: "contact-github",
      label: "Open GitHub",
      description: "View GitHub profile",
      icon: "github",
      category: "contact",
      keywords: ["github", "code", "repository", "projects"],
      action: () => {
        window.open("https://github.com/arolariu", "_blank");
        close();
      },
    },
  ]);

  // Filter commands based on search query
  const filteredCommands = $derived(() => {
    const allCommands = commands();
    if (!searchQuery.trim()) return allCommands;

    const query = searchQuery.toLowerCase();
    return allCommands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some((k) => k.includes(query));
      return labelMatch || descMatch || keywordMatch;
    });
  });

  // Group commands by category
  const groupedCommands = $derived(() => {
    const filtered = filteredCommands();
    const groups = {
      navigation: [] as CommandAction[],
      action: [] as CommandAction[],
      contact: [] as CommandAction[],
    };

    filtered.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  });

  // Get flat list for keyboard navigation
  const flatCommands = $derived(() => {
    const groups = groupedCommands();
    return [...groups.navigation, ...groups.action, ...groups.contact];
  });

  function open() {
    isOpen = true;
    searchQuery = "";
    selectedIndex = 0;
    setTimeout(() => inputRef?.focus(), 50);
  }

  function close() {
    isOpen = false;
    searchQuery = "";
    selectedIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    // Open with Cmd/Ctrl + K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
      return;
    }

    if (!isOpen) return;

    const cmds = flatCommands();

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % cmds.length;
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + cmds.length) % cmds.length;
        break;
      case "Enter":
        e.preventDefault();
        {
          const selectedCommand = cmds[selectedIndex];
          if (selectedCommand) {
            selectedCommand.action();
          }
        }
        break;
    }
  }

  // Reset selected index when filtered results change
  $effect(() => {
    flatCommands();
    selectedIndex = 0;
  });

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  });

  // Icon mapping
  function getIcon(name: string): string {
    const icons: Record<string, string> = {
      home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      file: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      code: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
      info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
      briefcase:
        "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
      moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
      download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
      clipboard:
        "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3",
      printer:
        "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
      linkedin: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
      github:
        "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
    };
    return icons[name] ?? icons["info"] ?? "";
  }

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    action: "Actions",
    contact: "Contact",
  };
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class={styles.backdrop}
    onclick={close}
    onkeydown={(e) => e.key === "Escape" && close()}
    role="button"
    tabindex="-1"
    aria-label="Close command palette">
  </div>

  <!-- Command Palette Modal -->
  <div
    class={styles.modal}
    role="dialog"
    aria-modal="true"
    aria-label="Command palette">
    <div class={styles.panel}>
      <!-- Search input -->
      <div class={styles.searchRow}>
        <svg
          class={styles.searchIcon}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          bind:this={inputRef}
          bind:value={searchQuery}
          type="text"
          placeholder="Type a command or search..."
          class={styles.input}
          aria-label="Search commands" />
        <kbd class={styles.escapeKey}> ESC </kbd>
      </div>

      <!-- Command list -->
      <div class={styles.commandList}>
        {#each Object.entries(groupedCommands()) as [category, cmds]}
          {#if cmds.length > 0}
            <div class={styles.commandGroup}>
              <div class={styles.categoryLabel}>
                {categoryLabels[category] ?? category}
              </div>
              {#each cmds as cmd}
                {@const globalIndex = flatCommands().indexOf(cmd)}
                {@const isSelected = globalIndex === selectedIndex}
                <button
                  onclick={() => cmd.action()}
                  onmouseenter={() => (selectedIndex = globalIndex)}
                  class={cx(styles.commandItem, isSelected ? styles.commandItemSelected : styles.commandItemIdle)}>
                  <svg
                    class={cx(styles.commandIcon, isSelected ? styles.commandIconSelected : styles.commandIconIdle)}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d={getIcon(cmd.icon)} />
                  </svg>
                  <div class={styles.commandText}>
                    <div class={styles.commandLabel}>{cmd.label}</div>
                    {#if cmd.description}
                      <div class={styles.commandDescription}>{cmd.description}</div>
                    {/if}
                  </div>
                  {#if isSelected}
                    <kbd class={styles.enterKey}> Enter </kbd>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        {/each}

        {#if flatCommands().length === 0}
          <div class={styles.emptyState}>
            <p>No commands found for "{searchQuery}"</p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class={styles.footer}>
        <div class={styles.footerContent}>
          <div class={styles.footerGroup}>
            <span class={styles.footerHint}>
              <kbd class={styles.key}>↑</kbd>
              <kbd class={styles.key}>↓</kbd>
              <span>to navigate</span>
            </span>
            <span class={styles.footerHint}>
              <kbd class={styles.key}>Enter</kbd>
              <span>to select</span>
            </span>
          </div>
          <span class={styles.footerHint}>
            <kbd class={styles.key}>⌘</kbd>
            <kbd class={styles.key}>K</kbd>
            <span>to toggle</span>
          </span>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Keyboard shortcut hint (always visible) -->
<button
  onclick={open}
  class={styles.trigger}
  aria-label="Open command palette (Cmd+K)">
  <svg
    class={styles.triggerIcon}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span class={styles.triggerLabel}>Quick actions</span>
  <kbd class={styles.triggerKey}>
    <span>⌘</span><span>K</span>
  </kbd>
</button>
