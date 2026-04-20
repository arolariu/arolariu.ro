<script lang="ts">
  /**
   * Summary card showing Mean Time To Resolve — the average duration of
   * resolved incidents whose start timestamp falls in the active window.
   * Rendered via `formatDuration` so small values read as `s`/`m` and long
   * outages read as `h`. No tween here (the number is humanized, not
   * numeric). Shares the `.card` shell styling defined globally in
   * SummaryStats.
   */
  import type {FilterWindow, IncidentsFile} from "../../types/status";
  import {computeMttr} from "../../aggregation/summaryStats";
  import {formatDuration} from "../../aggregation/formatDuration";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    /** Parsed incidents feed, or null while loading / if the feed failed. */
    incidents: IncidentsFile | null;
    /** Active time window — used to filter incidents by start timestamp. */
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  /** Mean time to resolve across resolved incidents in the window (ms). */
  const mttr = $derived(computeMttr(incidents, windowFilter));
</script>

<dl class="card">
  <dt>
    <span>MTTR</span>
    <InfoButton text="Mean duration of resolved incidents in the window." />
  </dt>
  <dd class="value">{formatDuration(mttr)}</dd>
  <dd class="sub">mean time to resolve</dd>
</dl>
