<script lang="ts">
  import {skills} from "@/data/skills";
  import {AnimatedSection} from "@/components/motion";
  import {onMount} from "svelte";

  let skillBarsVisible = $state(false);
  let sectionRef: HTMLElement | null = null;

  onMount(() => {
    if (!sectionRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            skillBarsVisible = true;
            observer.disconnect();
          }
        });
      },
      {threshold: 0.2}
    );

    observer.observe(sectionRef);
    return () => observer.disconnect();
  });

  // Color palette for skill categories
  const categoryColors = [
    {bg: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800"},
    {bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800"},
    {bg: "bg-emerald-500", light: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800"},
    {bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800"},
    {bg: "bg-pink-500", light: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800"},
    {bg: "bg-cyan-500", light: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800"},
  ];
</script>

<section
  bind:this={sectionRef}
  id="skills"
  class="py-16 px-6">
  <div class="container mx-auto max-w-6xl">
    <AnimatedSection
      id="skills-title"
      animation="fade-up">
      <div class="mb-10 text-center">
        <h2
          id="skills-heading"
          class="font-bold text-3xl mb-3">
          Professional <span class="text-blue-600 dark:text-blue-400">Skills</span>
        </h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Technical expertise and proficiency levels across different domains
        </p>
      </div>
    </AnimatedSection>

    <!-- Skills Grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each skills as category, categoryIndex}
        {@const colors = categoryColors[categoryIndex % categoryColors.length]}
        {@const avgLevel = Math.round(category.skills.reduce((sum, s) => sum + (s.level ?? 0), 0) / category.skills.length)}
        <AnimatedSection
          id="skill-category-{categoryIndex}"
          animation="fade-up"
          delay={categoryIndex * 100}>
          <div
            class="group relative bg-white dark:bg-gray-900 rounded-2xl p-6 border {colors.border} hover:border-opacity-60 transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/50 overflow-hidden">
            <!-- Subtle gradient background on hover -->
            <div
              class="absolute inset-0 {colors.light} opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            ></div>

            <!-- Category Header -->
            <div class="relative flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-xl {colors.bg} flex items-center justify-center shadow-sm">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.title}
                </h3>
                <span class="text-xs {colors.text} font-medium">{avgLevel}% avg proficiency</span>
              </div>
            </div>

            <!-- Skills List -->
            <div class="relative space-y-3">
              {#each category.skills as skill, skillIndex}
                {@const level = Math.max(0, Math.min(100, skill.level ?? 0))}
                <div class="group/skill">
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {skill.name}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums opacity-0 group-hover/skill:opacity-100 transition-opacity">
                      {level}%
                    </span>
                  </div>
                  <div
                    class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-label="{skill.name} proficiency"
                    aria-valuenow={level}
                    aria-valuemin={0}
                    aria-valuemax={100}>
                    <div
                      class="h-full rounded-full {colors.bg} transition-transform duration-700 ease-out"
                      style="transform-origin: left; transform: scaleX({skillBarsVisible ? level / 100 : 0}); transition-delay: {categoryIndex * 100 + skillIndex * 50}ms;">
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </AnimatedSection>
      {/each}
    </div>

    <!-- Skills Summary Pills -->
    <AnimatedSection
      id="skills-summary"
      animation="fade-up"
      delay={skills.length * 100 + 100}>
      <div class="mt-10 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Key Technologies</p>
        <div class="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {#each skills.flatMap((c) => c.skills.filter((s) => (s.level ?? 0) >= 80).slice(0, 3)) as skill, i}
            <span
              class="px-3 py-1.5 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-default"
              style="animation: fadeIn 0.3s ease-out {i * 50}ms both;">
              {skill.name}
            </span>
          {/each}
        </div>
      </div>
    </AnimatedSection>
  </div>
</section>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
