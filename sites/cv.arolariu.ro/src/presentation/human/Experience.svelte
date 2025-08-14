<!-- @format -->
<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {experiencesAsArray, parseList} from "@/data/experiences";
  import Badge from "@/presentation/Badge.svelte";
</script>

<section
  id="experience"
  class="py-16 px-6 relative overflow-hidden">
  <!-- Theme-aware gradient background -->
  <div
    class="absolute inset-0 transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4"
  ></div>

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
      </div>
    </AnimatedSection>

    <div class="max-w-6xl mx-auto">
      <div class="space-y-8">
        {#each experiencesAsArray as experience, index}
          <AnimatedSection
            id="experience-{index}"
            animation="fade-up"
            delay={index * 200}>
            <div
              class="backdrop-blur-sm rounded-xl p-8 shadow-lg hover-lift border border-gray-200 dark:border-gray-700 transition-all duration-300 bg-white/80 dark:bg-black/40">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                <div class="flex-1">
                  <h3 class="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    {experience.title}
                  </h3>
                  <p class="text-xl text-gray-800 dark:text-gray-200 mb-2">{experience.company}</p>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">{experience.location}</p>
                  <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {experience.description}
                  </p>
                </div>
                <div class="lg:ml-8 mt-4 lg:mt-0 block 2xsm:hidden">
                  <div
                    class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap">
                    {experience.period}
                  </div>
                </div>
              </div>

              {#if experience.responsibilities && experience.responsibilities.trim()}
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"> Key Responsibilities </h4>
                  <ul class="space-y-2 stagger-animation">
                    {#each parseList(experience.responsibilities) as item, i}
                      <li
                        class="flex items-start"
                        style={`--delay:${index * 200 + i * 90}ms`}>
                        <span class="mr-3 mt-1 text-sm font-medium text-blue-500 dark:text-blue-400">▶</span>
                        <span
                          class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                          >{item}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}

              {#if experience.achievements && experience.achievements.trim()}
                <div class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"> Key Achievements </h4>
                  <ul class="space-y-2 stagger-animation">
                    {#each parseList(experience.achievements) as item, i}
                      <li
                        class="flex items-start"
                        style={`--delay:${index * 200 + 100 + i * 90}ms`}>
                        <span class="mr-3 mt-1 text-sm font-medium text-green-500 dark:text-green-400">✓</span>
                        <span
                          class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                          >{item}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <div>
                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"> Technologies & Skills </h4>
                <div class="flex flex-wrap gap-2">
                  {#each parseList(experience.techAndSkills) as skill, skillIndex}
                    <Badge
                      text={skill}
                      color="blue"
                      size="sm"
                      variant="outline"
                      class="stagger-animation"
                      style={`--delay:${index * 200 + skillIndex * 50}ms`} />
                  {/each}
                </div>
              </div>
            </div>
          </AnimatedSection>
        {/each}
      </div>
    </div>
  </div>
</section>
