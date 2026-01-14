<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {experiencesAsArray, parseList} from "@/data/experiences";
  import Badge from "@/presentation/Badge.svelte";

  let expandedIndex = $state<number | null>(null);

  function toggleExpanded(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }
</script>

<section
  id="experience"
  class="py-16 px-6 relative overflow-hidden">
  <!-- Theme-aware gradient background -->
  <div
    class="absolute inset-0 transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4">
  </div>

  <div class="container mx-auto relative z-10">
    <AnimatedSection
      id="experience-title"
      animation="fade-up">
      <div class="mb-12 text-center">
        <h2
          id="experience-heading"
          class="font-bold text-3xl">
          Professional <span class="text-blue-600 dark:text-blue-400">Experience</span>
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Click on a role to expand details</p>
      </div>
    </AnimatedSection>

    <div class="max-w-6xl mx-auto">
      <!-- Timeline container -->
      <div class="relative">
        <!-- Timeline line -->
        <div
          class="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 transform md:-translate-x-1/2 hidden md:block"
        ></div>

        <div class="space-y-8 md:space-y-0">
          {#each experiencesAsArray as experience, index}
            {@const isExpanded = expandedIndex === index}
            {@const isEven = index % 2 === 0}
            <AnimatedSection
              id="experience-{index}"
              animation={isEven ? "fade-right" : "fade-left"}
              delay={index * 150}>
              <div class="relative md:flex md:items-start {isEven ? 'md:flex-row' : 'md:flex-row-reverse'} md:mb-12">
                <!-- Timeline dot -->
                <div
                  class="absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-4 border-white dark:border-gray-900 transform md:-translate-x-1/2 -translate-y-1/2 top-8 hidden md:block z-10 transition-transform duration-300 hover:scale-125"
                ></div>

                <!-- Date badge (mobile) -->
                <div class="md:hidden mb-3">
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    {experience.period}
                  </span>
                </div>

                <!-- Content card -->
                <div class="md:w-[calc(50%-2rem)] {isEven ? 'md:pr-8' : 'md:pl-8'}">
                  <button
                    onclick={() => toggleExpanded(index)}
                    class="w-full text-left backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border transition-all duration-300 cursor-pointer
                      {isExpanded
                      ? 'bg-white dark:bg-gray-800/90 border-blue-500/50 dark:border-blue-400/50 shadow-blue-500/10'
                      : 'bg-white/80 dark:bg-black/40 border-gray-200 dark:border-gray-700 hover:border-blue-500/30 dark:hover:border-blue-400/30'}
                      hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                    aria-expanded={isExpanded}>
                    <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                      <div class="flex-1">
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <h3 class="text-xl md:text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-1 leading-tight">
                              {experience.title}
                            </h3>
                            <p class="text-lg text-gray-800 dark:text-gray-200 font-medium">{experience.company}</p>
                          </div>
                          <!-- Expand icon -->
                          <div
                            class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center transition-transform duration-300 {isExpanded
                              ? 'rotate-180'
                              : ''}">
                            <svg
                              class="w-4 h-4 text-gray-500 dark:text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">{experience.location}</p>
                      </div>
                      <!-- Date badge (desktop) -->
                      <div class="hidden md:block lg:ml-4 mt-2 lg:mt-0 flex-shrink-0">
                        <span
                          class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white whitespace-nowrap">
                          {experience.period}
                        </span>
                      </div>
                    </div>

                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                      {experience.description}
                    </p>
                  </button>

                  <!-- Expandable content -->
                  {#if isExpanded}
                    <div
                      class="mt-4 backdrop-blur-sm rounded-xl p-6 md:p-8 bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 animate-expand">
                      {#if experience.responsibilities && experience.responsibilities.trim()}
                        <div class="mb-6">
                          <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Key Responsibilities
                          </h4>
                          <ul class="space-y-2">
                            {#each parseList(experience.responsibilities) as item, i}
                              <li
                                class="flex items-start stagger-animation"
                                style={`--delay:${i * 50}ms`}>
                                <span class="mr-3 mt-1.5 text-xs text-blue-500 dark:text-blue-400">▶</span>
                                <span
                                  class="text-gray-700 dark:text-gray-300 text-sm hover:text-gray-900 dark:hover:text-white transition-colors"
                                  >{item}</span>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}

                      {#if experience.achievements && experience.achievements.trim()}
                        <div class="mb-6">
                          <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Key Achievements
                          </h4>
                          <ul class="space-y-2">
                            {#each parseList(experience.achievements) as item, i}
                              <li
                                class="flex items-start stagger-animation"
                                style={`--delay:${i * 50 + 100}ms`}>
                                <span class="mr-3 mt-1.5 text-xs text-green-500 dark:text-green-400">✓</span>
                                <span
                                  class="text-gray-700 dark:text-gray-300 text-sm hover:text-gray-900 dark:hover:text-white transition-colors"
                                  >{item}</span>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}

                      <div>
                        <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          Technologies & Skills
                        </h4>
                        <div class="flex flex-wrap gap-2">
                          {#each parseList(experience.techAndSkills) as skill, skillIndex}
                            <Badge
                              text={skill}
                              color="blue"
                              size="sm"
                              variant="outline"
                              class="stagger-animation"
                              style={`--delay:${skillIndex * 30 + 200}ms`} />
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </AnimatedSection>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  @keyframes expand {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-expand {
    animation: expand 0.3s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-expand {
      animation: none;
    }
  }
</style>
