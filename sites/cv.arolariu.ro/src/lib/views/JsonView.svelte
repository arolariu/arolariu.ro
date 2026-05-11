<!--
@component JsonView

Reimagined developer-first JSON view: editorial hero, multi-language code
samples, infographic stat strip, refined endpoint catalog, preserved JSON
code panel, schema footer.
-->
<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {ui} from "@/data";
  import {jsonCVData} from "@/data/json";
  import {copyText, cx, downloadText} from "@/lib/utils";
  import Header, {type ActionConfig} from "@/presentation/Header.svelte";
  import styles from "./JsonView.module.scss";

  type CodeSampleId = "curl" | "javascript" | "python" | "powershell";

  let copySuccess = $state<boolean>(false);
  let activeTab = $state<"formatted" | "raw">("formatted");
  let showHighlighting = $state<boolean>(true);

  let activeCodeTab = $state<CodeSampleId>("curl");
  let copiedSample = $state<CodeSampleId | null>(null);

  const formattedJSON = JSON.stringify(jsonCVData, null, 2);
  const rawJSON = JSON.stringify(jsonCVData);

  const stats = $derived({
    sections: Object.keys(jsonCVData).filter((k) => k !== "$schema" && k !== "meta").length,
    workEntries: jsonCVData.work?.length ?? 0,
    certificates: jsonCVData.certificates?.length ?? 0,
    minifiedSize: rawJSON.length,
  });

  const codeSampleTabs: ReadonlyArray<{id: CodeSampleId; label: string}> = [
    {id: "curl", label: "curl"},
    {id: "javascript", label: "JavaScript"},
    {id: "python", label: "Python"},
    {id: "powershell", label: "PowerShell"},
  ];

  const codeSamples: Readonly<Record<CodeSampleId, string>> = {
    curl: `# Full CV with meta envelope
curl https://cv.arolariu.ro/rest/json

# Just the work history
curl https://cv.arolariu.ro/rest/json?section=work

# Minified, ATS-ready
curl https://cv.arolariu.ro/rest/json?format=resume&pretty=false`,
    javascript: `// Fetch and parse the full CV
const cv = await fetch("https://cv.arolariu.ro/rest/json").then((r) => r.json());

// List all positions held
console.log(cv.work.map((w) => w.position));`,
    python: `# Fetch and parse the full CV
import urllib.request, json
cv = json.load(urllib.request.urlopen("https://cv.arolariu.ro/rest/json"))

# List all positions held
print([w["position"] for w in cv["work"]])`,
    powershell: `# Fetch as a typed object via Invoke-RestMethod
$cv = Invoke-RestMethod -Uri "https://cv.arolariu.ro/rest/json"

# List all positions held
$cv.work | Select-Object position, name`,
  };

  function highlightJSON(jsonStr: string): string {
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  }

  const highlightedJSON = $derived(showHighlighting ? highlightJSON(formattedJSON) : formattedJSON);

  async function copyToClipboard(): Promise<void> {
    const textToCopy = activeTab === "raw" ? rawJSON : formattedJSON;
    await copyText(textToCopy);
    copySuccess = true;
    setTimeout(() => (copySuccess = false), 2000);
  }

  function downloadJSONFile(): void {
    const textToDownload = activeTab === "raw" ? rawJSON : formattedJSON;
    downloadText(textToDownload, "alexandru-olariu-cv.json", "application/json");
  }

  function setTab(tab: "formatted" | "raw"): void {
    activeTab = tab;
  }

  async function copySample(id: CodeSampleId): Promise<void> {
    await copyText(codeSamples[id]);
    copiedSample = id;
    setTimeout(() => {
      if (copiedSample === id) copiedSample = null;
    }, 2000);
  }

  const tabsConfig = $derived({
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

  const apiEndpoints: ReadonlyArray<{method: string; path: string; description: string}> = [
    {method: "GET", path: "/rest/json", description: "Full CV with meta envelope"},
    {method: "GET", path: "/rest/json?format=resume", description: "Raw JSON Resume only"},
    {method: "GET", path: "/rest/json?format=minimal", description: "Basics + work only"},
    {method: "GET", path: "/rest/json?section=skills", description: "Skills section only"},
    {method: "GET", path: "/rest/json?section=work", description: "Work experience only"},
    {method: "GET", path: "/rest/json?pretty=true", description: "Pretty-printed output"},
  ];

  const schemaChips: ReadonlyArray<{label: string; tone: "primary" | "secondary" | "success"}> = [
    {label: "JSON Resume Compatible", tone: "primary"},
    {label: "ATS Friendly", tone: "success"},
    {label: "ETag Caching", tone: "secondary"},
    {label: "CORS Enabled", tone: "secondary"},
  ];
</script>

<Header
  sticky
  showNavLinks={false}
  {actionsConfig} />

<section class={styles.main}>
  <div class={styles.container}>
    <!-- Editorial hero -->
    <AnimatedSection
      id="json-hero"
      animation="fade-up">
      <section class={styles.hero}>
        <span class={styles.heroPill}>REST &middot; JSON Resume v1.0.0</span>
        <h1 class={styles.heroTitle}>This CV is also an <span class={styles.heroTitleAccent}>API</span>.</h1>
        <p class={styles.heroSubtitle}>
          Pull my profile programmatically &mdash; for ATS pipelines, recruiter tooling, or your own resume aggregator. Conforms
          to JSON Resume v1.0.0.
        </p>
      </section>
    </AnimatedSection>

    <!-- Code samples -->
    <AnimatedSection
      id="json-samples"
      animation="fade-up">
      <section class={styles.codeSamples}>
        <div
          class={styles.codeSamplesTabs}
          role="tablist"
          aria-label="Code sample languages">
          {#each codeSampleTabs as tab}
            {@const isActive = activeCodeTab === tab.id}
            <button
              id="code-tab-{tab.id}"
              role="tab"
              aria-selected={isActive}
              aria-controls="code-sample-pane"
              class={cx(styles.codeSamplesTab, isActive && styles.codeSamplesTabActive)}
              onclick={() => (activeCodeTab = tab.id)}>
              {tab.label}
            </button>
          {/each}
        </div>
        <div
          id="code-sample-pane"
          class={styles.codeSamplesPane}
          role="tabpanel"
          aria-labelledby="code-tab-{activeCodeTab}">
          <pre class={styles.codeSamplesPre}>{codeSamples[activeCodeTab]}</pre>
          <button
            class={styles.codeSamplesCopy}
            onclick={() => copySample(activeCodeTab)}
            aria-label="Copy code sample">
            {copiedSample === activeCodeTab ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    </AnimatedSection>

    <!-- Stat strip -->
    <AnimatedSection
      id="json-stats"
      animation="fade-up">
      <section class={styles.statStrip}>
        <div
          class={styles.statItem}
          data-json-stat>
          <span class={styles.statValue}>{stats.sections}</span>
          <span class={styles.statKey}>Sections</span>
        </div>
        <div
          class={styles.statItem}
          data-json-stat>
          <span class={styles.statValue}>{stats.workEntries}</span>
          <span class={styles.statKey}>Work entries</span>
        </div>
        <div
          class={styles.statItem}
          data-json-stat>
          <span class={styles.statValue}>{stats.certificates}</span>
          <span class={styles.statKey}>Certificates</span>
        </div>
        <div
          class={styles.statItem}
          data-json-stat>
          <span class={styles.statValue}>
            {(stats.minifiedSize / 1024).toFixed(1)}<span class={styles.statUnit}>KB</span>
          </span>
          <span class={styles.statKey}>Minified</span>
        </div>
      </section>
    </AnimatedSection>

    <!-- Endpoint catalog -->
    <AnimatedSection
      id="json-endpoints"
      animation="fade-up">
      <section class={styles.endpointCatalog}>
        <h2 class={styles.endpointTitle}>Endpoints</h2>
        <p class={styles.endpointBlurb}>Each section can be retrieved on its own. All responses are JSON.</p>
        <div class={styles.endpointGrid}>
          {#each apiEndpoints as endpoint}
            <article
              class={styles.endpointCard}
              data-json-endpoint>
              <header class={styles.endpointCardHeader}>
                <span class={styles.methodBadge}>{endpoint.method}</span>
                <code class={styles.endpointPath}>{endpoint.path}</code>
              </header>
              <p class={styles.endpointDescription}>{endpoint.description}</p>
              <a
                class={styles.endpointTry}
                href="https://cv.arolariu.ro{endpoint.path}"
                target="_blank"
                rel="noopener noreferrer">
                Open response &rarr;
              </a>
            </article>
          {/each}
        </div>
      </section>
    </AnimatedSection>

    <!-- Code panel (formatted/raw + JSON) -->
    <AnimatedSection
      id="json-code"
      animation="fade-up">
      <section class={styles.codePanel}>
        <div class={styles.codePanelHeader}>
          <div class={styles.codePanelHeaderContent}>
            <div class={styles.fileMeta}>
              <span class={styles.fileName}>alexandru-olariu-cv.json</span>
              <span class={styles.schemaBadge}>JSON Resume v1.0.0</span>
            </div>
            <div class={styles.sizeMeta}>
              <span>
                {activeTab === "formatted"
                  ? formattedJSON.length.toLocaleString()
                  : rawJSON.length.toLocaleString()} chars
              </span>
              <span class={styles.kilobytes}>
                {(activeTab === "formatted" ? formattedJSON.length / 1024 : rawJSON.length / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <div
            class={styles.codePanelTabs}
            role="tablist"
            aria-label="JSON format toggle">
            {#each tabsConfig.options as opt}
              {@const isActive = tabsConfig.active === opt.id}
              <button
                id="json-format-tab-{opt.id}"
                role="tab"
                aria-selected={isActive}
                aria-controls="json-content-pane"
                class={cx(styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonIdle)}
                onclick={() => tabsConfig.onChange(opt.id)}>
                {opt.label}
              </button>
            {/each}
            {#if activeTab === "formatted"}
              <label class={styles.highlightToggle}>
                <input
                  type="checkbox"
                  bind:checked={showHighlighting}
                  class={styles.highlightCheckbox} />
                <span>Highlight</span>
              </label>
            {/if}
          </div>
        </div>
        <div
          id="json-content-pane"
          class={styles.jsonContainer}
          role="tabpanel"
          aria-labelledby="json-format-tab-{activeTab}">
          {#if activeTab === "formatted" && showHighlighting}
            <pre class={styles.pre}>{@html highlightedJSON}</pre>
          {:else}
            <pre class={styles.prePlain}>{activeTab === "formatted" ? formattedJSON : rawJSON}</pre>
          {/if}
        </div>
      </section>
    </AnimatedSection>

    <!-- Schema footer -->
    <AnimatedSection
      id="json-schema"
      animation="fade-up">
      <section class={styles.schemaPanel}>
        <h2 class={styles.schemaTitle}>JSON Resume Schema</h2>
        <p class={styles.schemaDescription}>
          This JSON follows the standardized JSON Resume schema v1.0.0, making it compatible with various resume builders, parsers,
          and ATS systems that support this format.
        </p>
        <div class={styles.schemaBadgeList}>
          {#each schemaChips as chip}
            <span
              class={cx(styles.schemaChip, styles[`schemaChip_${chip.tone}`])}
              data-json-chip>
              {chip.label}
            </span>
          {/each}
        </div>
      </section>
    </AnimatedSection>
  </div>
</section>
