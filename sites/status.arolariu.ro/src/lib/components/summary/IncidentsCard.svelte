<script lang="ts">
  /**
   * Summary card showing incidents whose start timestamp falls inside the
   * active window. The big number is total count (tweened), and the subline
   * splits it into ongoing vs resolved. Tier is elevated to "slow" whenever
   * there is at least one ongoing incident, regardless of resolved volume.
   * Shares the `.card` shell styling defined globally in SummaryStats.
   */
  import type {FilterWindow, IncidentsFile} from "../../types/status";
  import {computeIncidentCount} from "../../aggregation/summaryStats";
  import {useCountTween} from "../../hooks/useCountTween.svelte";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    /** Parsed incidents feed, or null while loading / if the feed failed. */
    incidents: IncidentsFile | null;
    /** Active time window — used to filter incidents by start timestamp. */
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  /** Breakdown `{total, open, resolved}` for incidents falling in the window. */
  const incCount = $derived(computeIncidentCount(incidents, windowFilter));
  /** Tweened accessor for the headline total so window changes animate. */
  const displayIncidents = useCountTween(() => incCount.total);
  /** "slow" when anything is ongoing; "fast" when nothing happened; otherwise "ok". */
  const tier = $derived(
    incCount.open > 0 ? "slow" : incCount.total === 0 ? "fast" : "ok"
  );
</script>

<dl class="card">
  <dt>
    <span>Incidents</span>
    <InfoButton text="Count of incidents whose start timestamp falls in the window." />
  </dt>
  <dd class="value tier-{tier}">{Math.round(displayIncidents())}</dd>
  <dd class="sub">{incCount.open} ongoing · {incCount.resolved} resolved</dd>
</dl>
