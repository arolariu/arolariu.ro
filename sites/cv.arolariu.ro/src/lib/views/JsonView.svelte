<!-- @format -->
<script lang="ts">
  import {ui} from "@/data";
  import Header, {type ActionConfig} from "@/presentation/Header.svelte";
  import {copyText, downloadText} from "@/lib/utils";
  import {jsonCVData} from "@/data/json";

  let copySuccess = $state(false);
  let activeTab = $state<"formatted" | "raw">("formatted");

  const formattedJSON = JSON.stringify(jsonCVData, null, 2);
  const rawJSON = JSON.stringify(jsonCVData);

  async function copyToClipboard() {
    const textToCopy = activeTab === "raw" ? rawJSON : formattedJSON;
    await copyText(textToCopy);
    copySuccess = true;
    setTimeout(() => (copySuccess = false), 2000);
  }

  function downloadJSONFile() {
    const textToDownload = activeTab === "raw" ? rawJSON : formattedJSON;
    downloadText(textToDownload, "alexandru-olariu-cv.json", "application/json");
  }

  function setTab(tab: "formatted" | "raw") {
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
      onClick: copyToClipboard,
    },
    {
      icon: "download",
      label: `${ui.buttons.download} JSON`,
      onClick: downloadJSONFile,
    },
  ]);
</script>

<!-- Navigation with embedded actions -->
<Header
  sticky
  showNavLinks={false}
  {actionsConfig} />

<!-- Tabs Bar -->
<section class="mt-4 px-6">
  <div class="max-w-6xl mx-auto">
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
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 cursor-pointer"
          class:!bg-white={tabsConfig.active === opt.id}
          class:!text-blue-600={tabsConfig.active === opt.id}
          class:!text-gray-600={tabsConfig.active !== opt.id}
          class:dark:!bg-gray-900={tabsConfig.active === opt.id}
          class:dark:!text-blue-400={tabsConfig.active === opt.id}
          class:dark:!text-gray-300={tabsConfig.active !== opt.id}>
          {opt.label}
        </button>
      {/each}
    </div>
  </div>
</section>

<main
  id="main-content"
  class="min-h-screen transition-colors duration-300">
  <div class="max-w-6xl mx-auto p-6">
    <div
      class="rounded-lg border overflow-hidden shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div class="px-4 py-2 border-b transition-colors duration-300 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <span class="text-sm font-mono transition-colors duration-300 text-gray-600 dark:text-gray-400">alexandru-olariu-cv.json</span>
          <span class="text-xs transition-colors duration-300 text-gray-500 dark:text-gray-500"
            >{activeTab === "formatted" ? formattedJSON.length : rawJSON.length} characters</span>
        </div>
      </div>
      <div class="p-4 overflow-auto max-h-[70vh]">
        <pre class="text-sm font-mono whitespace-pre-wrap break-words transition-colors duration-300 text-gray-900 dark:text-gray-100"
          >{activeTab === "formatted" ? formattedJSON : rawJSON}</pre>
      </div>
    </div>

    <div class="mt-6 rounded-lg p-4 border transition-all duration-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
      <h3 class="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300"> JSON Resume Schema </h3>
      <p class="text-sm mb-3 transition-colors duration-300 text-gray-600 dark:text-gray-400">
        This JSON follows the standardized JSON Resume schema v1.0.0, making it compatible with various resume builders, parsers, and ATS
        systems that support this format.
      </p>
      <div class="flex flex-wrap gap-2">
        <span class="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs transition-colors duration-300"
          >JSON Resume Compatible</span>
        <span
          class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs transition-colors duration-300"
          >ATS Friendly</span>
        <span
          class="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs transition-colors duration-300"
          >API Ready</span>
        <span
          class="bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded text-xs transition-colors duration-300"
          >Machine Readable</span>
      </div>
    </div>

    <!-- API access info -->
    <div class="mt-6 rounded-lg p-4 border transition-all duration-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">API access</h3>
      <p class="text-sm mb-3 transition-colors duration-300 text-gray-600 dark:text-gray-400">
        You can also access this JSON resume via the public API endpoint:
      </p>
      <div class="flex items-center gap-2 text-xs font-mono">
        <span class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">HTTP GET</span>
        <a
          href="https://cv.arolariu.ro/rest/json"
          target="_blank"
          rel="noopener noreferrer"
          class="underline break-all text-blue-700 dark:text-blue-300">
          https://cv.arolariu.ro/rest/json
        </a>
      </div>
    </div>
  </div>
</main>
