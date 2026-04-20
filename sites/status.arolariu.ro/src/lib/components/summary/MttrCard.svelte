<script lang="ts">
  import type {FilterWindow, IncidentsFile} from "../../types/status";
  import {computeMttr} from "../../aggregation/summaryStats";
  import {formatDuration} from "../../aggregation/formatDuration";
  import InfoButton from "../chrome/InfoButton.svelte";

  interface Props {
    incidents: IncidentsFile | null;
    windowFilter: FilterWindow;
  }

  let {incidents, windowFilter}: Props = $props();

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
