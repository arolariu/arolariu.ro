<script lang="ts">
  import {page} from "$app/state";
</script>

<main class="p-8">
  <h1 class="text-xl font-semibold">Error {page.status}</h1>
  <p class="mt-2 opacity-60">{page.error?.message ?? "Something went wrong."}</p>
</main>
