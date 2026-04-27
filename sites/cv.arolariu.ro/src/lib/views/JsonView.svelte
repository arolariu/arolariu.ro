<!--
@component JsonView

Displays CV data in JSON format with syntax highlighting, statistics, and copy/download functionality.

@remarks
**Rendering Context**: SvelteKit page component (SSR + hydration).

**Purpose**: Presents the CV as structured JSON data following the
JSON Resume schema v1.0.0, enabling interoperability with resume parsers,
ATS systems, and developer tooling.

**Features**:
- Syntax highlighting for JSON (keys, strings, numbers, booleans, null)
- Toggle between formatted (pretty-printed) and raw (minified) JSON
- Copy to clipboard with visual feedback
- Download as `.json` file
- Statistics display (sections, entries, size)
- Interactive API documentation with endpoints

**JSON Resume Schema**: Output conforms to https://jsonresume.org/schema/
for maximum compatibility with resume processing tools.

@example
```svelte
<JsonView />
```

@see {@link jsonCVData} for the underlying data structure
-->
<script lang="ts">
  import {ui} from "@/data";
  import Header, {type ActionConfig} from "@/presentation/Header.svelte";
  import {copyText, cx, downloadText} from "@/lib/utils";
  import {jsonCVData} from "@/data/json";
  import styles from "./JsonView.module.scss";

  /** Tracks whether the copy action succeeded (resets after 2 seconds). */
  let copySuccess = $state<boolean>(false);

  /** Active tab controlling JSON format display: "formatted" or "raw". */
  let activeTab = $state<"formatted" | "raw">("formatted");

  /** Whether to show syntax highlighting (default: true for formatted view). */
  let showHighlighting = $state<boolean>(true);

  /** Pre-computed pretty-printed JSON with 2-space indentation. */
  const formattedJSON = JSON.stringify(jsonCVData, null, 2);

  /** Pre-computed minified JSON (no whitespace). */
  const rawJSON = JSON.stringify(jsonCVData);

  /** Statistics about the JSON data. */
  const stats = $derived({
    totalSize: formattedJSON.length,
    minifiedSize: rawJSON.length,
    sections: Object.keys(jsonCVData).filter((k) => k !== "$schema" && k !== "meta").length,
    workEntries: jsonCVData.work?.length ?? 0,
    educationEntries: jsonCVData.education?.length ?? 0,
    skillCategories: jsonCVData.skills?.length ?? 0,
    certificates: jsonCVData.certificates?.length ?? 0,
    compressionRatio: Math.round((1 - rawJSON.length / formattedJSON.length) * 100),
  });

  /**
   * Applies syntax highlighting to JSON string.
   */
  function highlightJSON(jsonStr: string): string {
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  }

  /** Highlighted JSON for display. */
  const highlightedJSON = $derived(showHighlighting ? highlightJSON(formattedJSON) : formattedJSON);

  /**
   * Copies the currently visible JSON to the system clipboard.
   */
  async function copyToClipboard(): Promise<void> {
    const textToCopy = activeTab === "raw" ? rawJSON : formattedJSON;
    await copyText(textToCopy);
    copySuccess = true;
    setTimeout(() => (copySuccess = false), 2000);
  }

  /**
   * Downloads the currently visible JSON as a file.
   */
  function downloadJSONFile(): void {
    const textToDownload = activeTab === "raw" ? rawJSON : formattedJSON;
    downloadText(textToDownload, "alexandru-olariu-cv.json", "application/json");
  }

  /**
   * Switches between formatted and raw JSON display modes.
   */
  function setTab(tab: "formatted" | "raw"): void {
    activeTab = tab;
  }

  interface TabsConfig {
    options: {id: string; label: string}[];
    active: string;
    onChange: (id: string) => void;
  }

  const tabsConfig = $derived<TabsConfig>({
    options: [
      {id: "formatted", label: ui.formats.formatted},
      {id: "raw", label: ui.formats.raw},
    ],
    active: activeTab,
    onChange: (id: string) => setTab(id as "formatted" | "raw"),
  });

  const actionsConfig = $derived<ActionConfig[]>([
    {
      icon: "copy",
      label: copySuccess ? ui.buttons.copied : `${ui.buttons.copy} JSON`,
      loading: false,
      disabled: false,
      onClick: copyToClipboard,
    },
    {
      icon: "download",
      label: `${ui.buttons.download} JSON`,
      loading: false,
      disabled: false,
      onClick: downloadJSONFile,
    },
  ]);

  /** API endpoints for documentation. */
  const apiEndpoints = [
    {method: "GET", path: "/rest/json", description: "Full CV with meta envelope"},
    {method: "GET", path: "/rest/json?format=resume", description: "Raw JSON Resume only"},
    {method: "GET", path: "/rest/json?format=minimal", description: "Basics + work only"},
    {method: "GET", path: "/rest/json?section=skills", description: "Skills section only"},
    {method: "GET", path: "/rest/json?section=work", description: "Work experience only"},
    {method: "GET", path: "/rest/json?pretty=true", description: "Pretty-printed output"},
  ];
</script>

<!-- Navigation with embedded actions -->
<Header
  sticky
  showNavLinks={false}
  {actionsConfig} />

<!-- Stats Cards -->
<section class={styles.statsSection}>
  <div class={styles.container}>
    <div class={styles.statsGrid}>
      <div class={cx(styles.statCard, styles.statBlue)}>
        <div class={styles.statValue}>{stats.sections}</div>
        <div class={styles.statLabel}>Sections</div>
      </div>
      <div class={cx(styles.statCard, styles.statGreen)}>
        <div class={styles.statValue}>{stats.workEntries}</div>
        <div class={styles.statLabel}>Work Entries</div>
      </div>
      <div class={cx(styles.statCard, styles.statPurple)}>
        <div class={styles.statValue}>{stats.educationEntries}</div>
        <div class={styles.statLabel}>Education</div>
      </div>
      <div class={cx(styles.statCard, styles.statOrange)}>
        <div class={styles.statValue}>{stats.skillCategories}</div>
        <div class={styles.statLabel}>Skill Groups</div>
      </div>
      <div class={cx(styles.statCard, styles.statPink)}>
        <div class={styles.statValue}>{stats.certificates}</div>
        <div class={styles.statLabel}>Certificates</div>
      </div>
      <div class={cx(styles.statCard, styles.statGray)}>
        <div class={styles.statValue}>{stats.compressionRatio}%</div>
        <div class={styles.statLabel}>Compressible</div>
      </div>
    </div>
  </div>
</section>

<!-- Tabs Bar -->
<section class={styles.tabsSection}>
  <div class={cx(styles.container, styles.tabsContainer)}>
    <div
      class={styles.tabList}
      role="tablist"
      aria-label="Format toggle">
      {#each tabsConfig.options as opt}
        {@const isActive = tabsConfig.active === opt.id}
        <button
          role="tab"
          aria-selected={isActive}
          aria-controls={`tab-panel-${opt.id}`}
          onclick={() => tabsConfig.onChange(opt.id)}
          class={cx(styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonIdle)}>
          {opt.label}
        </button>
      {/each}
    </div>

    {#if activeTab === "formatted"}
      <label class={styles.highlightToggle}>
        <input
          type="checkbox"
          bind:checked={showHighlighting}
          class={styles.highlightCheckbox} />
        <span>Syntax Highlighting</span>
      </label>
    {/if}
  </div>
</section>

<main
  id="main-content"
  class={styles.main}>
  <div class={styles.containerWithPadding}>
    <!-- JSON Code Block -->
    <div class={styles.codePanel}>
      <div class={styles.codeHeader}>
        <div class={styles.codeHeaderContent}>
          <div class={styles.fileMeta}>
            <span class={styles.fileName}>alexandru-olariu-cv.json</span>
            <span class={styles.schemaBadge}> JSON Resume v1.0.0 </span>
          </div>
          <div class={styles.sizeMeta}>
            <span>{activeTab === "formatted" ? formattedJSON.length.toLocaleString() : rawJSON.length.toLocaleString()} chars</span>
            <span class={styles.kilobytes}
              >{(activeTab === "formatted" ? formattedJSON.length / 1024 : rawJSON.length / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </div>
      <div class={styles.jsonContainer}>
        {#if activeTab === "formatted" && showHighlighting}
          <pre class={styles.pre}>{@html highlightedJSON}</pre>
        {:else}
          <pre class={styles.prePlain}>{activeTab === "formatted" ? formattedJSON : rawJSON}</pre>
        {/if}
      </div>
    </div>

    <!-- API Endpoints Documentation -->
    <div class={styles.apiPanel}>
      <div class={styles.apiHeader}>
        <h3 class={styles.apiTitle}>
          <svg
            class={styles.apiIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          API Endpoints
        </h3>
        <p class={styles.apiDescription}> Access this CV programmatically via the REST API </p>
      </div>
      <div class={styles.endpointList}>
        {#each apiEndpoints as endpoint}
          <div class={styles.endpointRow}>
            <span class={styles.methodBadge}>
              {endpoint.method}
            </span>
            <code class={styles.endpointPath}>
              {endpoint.path}
            </code>
            <span class={styles.endpointDescription}>
              {endpoint.description}
            </span>
            <a
              href="https://cv.arolariu.ro{endpoint.path}"
              target="_blank"
              rel="noopener noreferrer"
              class={styles.tryLink}>
              Try it
            </a>
          </div>
        {/each}
      </div>
    </div>

    <!-- JSON Resume Schema Info -->
    <div class={styles.schemaPanel}>
      <h3 class={styles.schemaTitle}>JSON Resume Schema</h3>
      <p class={styles.schemaDescription}>
        This JSON follows the standardized JSON Resume schema v1.0.0, making it compatible with various resume builders, parsers, and ATS
        systems that support this format.
      </p>
      <div class={styles.schemaBadgeList}>
        <span class={cx(styles.schemaChip, styles.schemaChipBlue)}> JSON Resume Compatible </span>
        <span class={cx(styles.schemaChip, styles.schemaChipGreen)}> ATS Friendly </span>
        <span class={cx(styles.schemaChip, styles.schemaChipPurple)}> ETag Caching </span>
        <span class={cx(styles.schemaChip, styles.schemaChipOrange)}> CORS Enabled </span>
      </div>
    </div>
  </div>
</main>
