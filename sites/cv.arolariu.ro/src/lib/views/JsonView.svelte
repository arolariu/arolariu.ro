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
  import {copyText, downloadText} from "@/lib/utils";
  import {jsonCVData} from "@/data/json";

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
<section class="mt-4 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sections}</div>
        <div class="text-xs text-blue-700 dark:text-blue-300">Sections</div>
      </div>
      <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{stats.workEntries}</div>
        <div class="text-xs text-green-700 dark:text-green-300">Work Entries</div>
      </div>
      <div class="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.educationEntries}</div>
        <div class="text-xs text-purple-700 dark:text-purple-300">Education</div>
      </div>
      <div class="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.skillCategories}</div>
        <div class="text-xs text-orange-700 dark:text-orange-300">Skill Groups</div>
      </div>
      <div class="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
        <div class="text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.certificates}</div>
        <div class="text-xs text-pink-700 dark:text-pink-300">Certificates</div>
      </div>
      <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div class="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.compressionRatio}%</div>
        <div class="text-xs text-gray-700 dark:text-gray-300">Compressible</div>
      </div>
    </div>
  </div>
</section>

<!-- Tabs Bar -->
<section class="mt-4 px-6">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center gap-4">
    <div
      class="inline-flex rounded-lg p-1 border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
      role="tablist"
      aria-label="Format toggle">
      {#each tabsConfig.options as opt}
        <button
          role="tab"
          aria-selected={tabsConfig.active === opt.id}
          aria-controls={`tab-panel-${opt.id}`}
          onclick={() => tabsConfig.onChange(opt.id)}
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          class:bg-white={tabsConfig.active === opt.id}
          class:text-blue-600={tabsConfig.active === opt.id}
          class:text-gray-600={tabsConfig.active !== opt.id}
          class:dark:bg-gray-900={tabsConfig.active === opt.id}
          class:dark:text-blue-400={tabsConfig.active === opt.id}
          class:dark:text-gray-300={tabsConfig.active !== opt.id}>
          {opt.label}
        </button>
      {/each}
    </div>

    {#if activeTab === "formatted"}
      <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={showHighlighting}
          class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer" />
        <span>Syntax Highlighting</span>
      </label>
    {/if}
  </div>
</section>

<main
  id="main-content"
  class="min-h-screen transition-colors duration-300">
  <div class="max-w-6xl mx-auto p-6">
    <!-- JSON Code Block -->
    <div
      class="rounded-lg border overflow-hidden shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div class="px-4 py-2 border-b transition-colors duration-300 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <span class="text-sm font-mono transition-colors duration-300 text-gray-600 dark:text-gray-400">alexandru-olariu-cv.json</span>
            <span class="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
              JSON Resume v1.0.0
            </span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span>{activeTab === "formatted" ? formattedJSON.length.toLocaleString() : rawJSON.length.toLocaleString()} chars</span>
            <span class="hidden sm:inline"
              >{(activeTab === "formatted" ? formattedJSON.length / 1024 : rawJSON.length / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </div>
      <div class="p-4 overflow-auto max-h-[60vh] json-container">
        {#if activeTab === "formatted" && showHighlighting}
          <pre class="text-sm font-mono whitespace-pre-wrap break-words">{@html highlightedJSON}</pre>
        {:else}
          <pre class="text-sm font-mono whitespace-pre-wrap break-words transition-colors duration-300 text-gray-900 dark:text-gray-100"
            >{activeTab === "formatted" ? formattedJSON : rawJSON}</pre>
        {/if}
      </div>
    </div>

    <!-- API Endpoints Documentation -->
    <div
      class="mt-6 rounded-lg border overflow-hidden transition-all duration-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <svg
            class="w-5 h-5"
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
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1"> Access this CV programmatically via the REST API </p>
      </div>
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each apiEndpoints as endpoint}
          <div
            class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <span class="px-2 py-0.5 text-xs font-mono rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 w-fit">
              {endpoint.method}
            </span>
            <code class="text-sm font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
              {endpoint.path}
            </code>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {endpoint.description}
            </span>
            <a
              href="https://cv.arolariu.ro{endpoint.path}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap">
              Try it
            </a>
          </div>
        {/each}
      </div>
    </div>

    <!-- JSON Resume Schema Info -->
    <div class="mt-6 rounded-lg p-4 border transition-all duration-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
      <h3 class="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">JSON Resume Schema</h3>
      <p class="text-sm mb-3 transition-colors duration-300 text-gray-600 dark:text-gray-400">
        This JSON follows the standardized JSON Resume schema v1.0.0, making it compatible with various resume builders, parsers, and ATS
        systems that support this format.
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          class="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs transition-colors duration-300">
          JSON Resume Compatible
        </span>
        <span
          class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs transition-colors duration-300">
          ATS Friendly
        </span>
        <span
          class="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs transition-colors duration-300">
          ETag Caching
        </span>
        <span
          class="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs transition-colors duration-300">
          CORS Enabled
        </span>
      </div>
    </div>
  </div>
</main>

<style>
  .json-container :global(.json-key) {
    color: #0550ae;
  }
  .json-container :global(.json-string) {
    color: #0a3069;
  }
  .json-container :global(.json-number) {
    color: #0550ae;
  }
  .json-container :global(.json-boolean) {
    color: #cf222e;
  }
  .json-container :global(.json-null) {
    color: #6e7781;
  }

  :global(.dark) .json-container :global(.json-key) {
    color: #79c0ff;
  }
  :global(.dark) .json-container :global(.json-string) {
    color: #a5d6ff;
  }
  :global(.dark) .json-container :global(.json-number) {
    color: #79c0ff;
  }
  :global(.dark) .json-container :global(.json-boolean) {
    color: #ff7b72;
  }
  :global(.dark) .json-container :global(.json-null) {
    color: #8b949e;
  }
</style>
