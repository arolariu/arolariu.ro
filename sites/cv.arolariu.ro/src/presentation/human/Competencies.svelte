<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {competencies} from "@/data";

  const displayedCompetencies = [
    {
      ...competencies.engineeringExcellence,
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      ...competencies.testDrivenDevelopment,
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    },
    {
      ...competencies.domainDrivenDesign,
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      ...competencies.customerCentric,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
    {
      ...competencies.agileMethodologies,
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      ...competencies.algorithmicSkills,
      icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    },
  ];
</script>

<section class="py-16 px-6 relative overflow-hidden">
  <!-- Theme-aware gradient background -->
  <div
    class="absolute inset-0 transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4"
  ></div>

  <div class="container mx-auto relative z-10">
    <AnimatedSection
      id="competencies-title"
      animation="fade-up">
      <div class="mb-12 text-center">
        <h2
          id="competencies"
          class="font-bold text-3xl">
          Core <span class="text-blue-600 dark:text-blue-400">Competencies</span>
        </h2>
        <p class="mt-3 text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-sm">
          A showcase of Alexandru's technical skills and professional competencies that drive his success.
        </p>
      </div>
    </AnimatedSection>

    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each displayedCompetencies as competency, index}
          <AnimatedSection
            id="competency-{index}"
            animation="fade-up"
            delay={index * 150}>
            <div
              class="backdrop-blur-sm rounded-xl p-6 shadow-lg hover-lift border border-gray-200 dark:border-gray-700 h-full transition-all duration-300 bg-white/80 dark:bg-black/40">
              <div class="flex items-center mb-4">
                <div
                  class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <svg
                    class="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d={competency.icon}></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {competency.title}
                </h3>
              </div>
              <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {competency.description}
              </p>
            </div>
          </AnimatedSection>
        {/each}
      </div>
    </div>
  </div>
</section>
