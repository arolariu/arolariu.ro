<script lang="ts">
  import type {FilterWindow, IncidentsFile} from "../../types/status";
  import {computeIncidentCount} from "../../aggregation/summaryStats";
  import {useCountTween} from "../../hooks/useCountTween.svelte";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

  const incCount = $derived(computeIncidentCount(incidents, windowFilter));
  const displayIncidents = useCountTween(() => incCount.total);
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
