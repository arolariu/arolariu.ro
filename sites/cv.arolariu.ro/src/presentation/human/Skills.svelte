<script lang="ts">
  import {skills} from "@/data/skills";
</script>

<section
  id="skills"
  class="py-16 px-6">
  <div class="container mx-auto">
    <div class="mb-12 text-center">
      <h2
        id="skills-heading"
        class="font-bold text-3xl">
        Professional <span class="text-blue-600 dark:text-blue-400">Skills</span>
      </h2>
    </div>

    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each skills as category}
          <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover-lift hover-glow">
            <h3 class="text-xl font-semibold mb-4 text-blue-400">{category.title}</h3>
            <div class="space-y-3">
              {#each category.skills as skill}
                <div class="flex justify-between items-center">
                  <span class="text-gray-300">{skill.name}</span>
                  <div
                    class="flex items-center space-x-2"
                    aria-label={`${skill.name} proficiency`}>
                    <div class="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        class="h-2 rounded-full bg-blue-500"
                        style={`width: ${Math.max(0, Math.min(100, skill.level ?? 0))}%;`}></div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-mono min-w-[3ch]">
                      {Math.max(0, Math.min(100, skill.level ?? 0))}%
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
