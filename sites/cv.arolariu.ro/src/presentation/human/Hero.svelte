<script lang="ts">
  import {author} from "@/data";

  let heroVisible = $state(false);
  let imageLoaded = $state(false);

  // Trigger hero animation shortly after mount
  $effect(() => {
    const t = setTimeout(() => (heroVisible = true), 200);
    return () => clearTimeout(t);
  });

  function handleImageLoad() {
    imageLoaded = true;
  }
</script>

<section
  class="pt-24 pb-16 px-6 relative overflow-hidden"
  style="view-transition-name: hero-section;">
  <!-- Theme-aware animated gradient background elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      class="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-float transition-all duration-500 bg-gradient-to-tr from-blue-500/10 via-purple-500/8 to-pink-500/5 dark:from-blue-500/15 dark:via-purple-500/10 dark:to-pink-500/5">
    </div>
    <div
      class="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-float-delayed transition-all duration-500 bg-gradient-to-tr from-pink-500/10 via-purple-500/8 to-blue-500/5 dark:from-pink-500/15 dark:via-purple-500/10 dark:to-blue-500/5">
    </div>
  </div>

  <div class="container mx-auto text-center relative z-10">
    <!-- Profile Image with enhanced animation -->
    <div class="mb-8 relative inline-block">
      <div
        class="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 blur-md opacity-50 scale-105 transition-opacity duration-500"
        class:opacity-0={!imageLoaded}>
      </div>
      <img
        src="/author.jpeg"
        alt={author.name}
        onload={handleImageLoad}
        class="w-48 h-48 rounded-full mx-auto border-4 border-blue-500 dark:border-blue-400 shadow-xl relative transition-all duration-700 ease-out"
        class:opacity-100={heroVisible && imageLoaded}
        class:opacity-0={!heroVisible || !imageLoaded}
        class:scale-100={heroVisible}
        class:scale-90={!heroVisible}
        style="view-transition-name: profile-image;" />
    </div>

    <!-- Name with staggered letter reveal feel -->
    <div
      class="transition-all duration-700 ease-out"
      class:opacity-100={heroVisible}
      class:opacity-0={!heroVisible}
      class:translate-y-0={heroVisible}
      class:translate-y-6={!heroVisible}
      style="transition-delay: 100ms;">
      <h1 class="text-4xl md:text-6xl font-bold mb-4">
        <span class="inline-block">Alexandru-Razvan</span>
        <span class="text-blue-600 dark:text-blue-400 inline-block"> Olariu </span>
      </h1>
    </div>

    <!-- Tagline with animated underline effect -->
    <div
      class="transition-all duration-700 ease-out"
      class:opacity-100={heroVisible}
      class:opacity-0={!heroVisible}
      class:translate-y-0={heroVisible}
      class:translate-y-6={!heroVisible}
      style="transition-delay: 250ms;">
      <p class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-6 relative inline-block">
        <span class="relative">
          Software Engineer
          <span
            class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500/30 dark:bg-blue-400/30 transform origin-left transition-transform duration-700 delay-700"
            class:scale-x-100={heroVisible}
            class:scale-x-0={!heroVisible}></span>
        </span>
        <span class="text-gray-400 dark:text-gray-500 mx-2">|</span>
        <span class="relative">
          Solution Architect
          <span
            class="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500/30 dark:bg-purple-400/30 transform origin-left transition-transform duration-700 delay-800"
            class:scale-x-100={heroVisible}
            class:scale-x-0={!heroVisible}></span>
        </span>
        <span class="text-gray-400 dark:text-gray-500 mx-2">|</span>
        <span class="relative">
          Mentor
          <span
            class="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500/30 dark:bg-pink-400/30 transform origin-left transition-transform duration-700 delay-900"
            class:scale-x-100={heroVisible}
            class:scale-x-0={!heroVisible}></span>
        </span>
      </p>
    </div>

    <!-- Description -->
    <div
      class="transition-all duration-700 ease-out"
      class:opacity-100={heroVisible}
      class:opacity-0={!heroVisible}
      class:translate-y-0={heroVisible}
      class:translate-y-6={!heroVisible}
      style="transition-delay: 400ms;">
      <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
        {new Date().getFullYear() - 2000}-year-old passionate software engineer based in {author.location}, dedicated to creating innovative
        solutions and building exceptional digital experiences.
      </p>
    </div>

    <!-- CTA Buttons -->
    <div
      class="flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 ease-out"
      class:opacity-100={heroVisible}
      class:opacity-0={!heroVisible}
      class:translate-y-0={heroVisible}
      class:translate-y-6={!heroVisible}
      style="transition-delay: 550ms;">
      <a
        href="#contact"
        class="group bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 dark:hover:shadow-blue-400/25 hover:-translate-y-0.5 active:translate-y-0">
        <span class="flex items-center justify-center gap-2">
          Get In Touch
          <svg
            class="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </a>
      <a
        href="#experience"
        class="group border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:text-gray-900 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
        <span class="flex items-center justify-center gap-2">
          View My Work
          <svg
            class="w-4 h-4 transition-transform group-hover:translate-y-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </span>
      </a>
    </div>
  </div>
</section>

<style>
  @keyframes float {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-20px) scale(1.05);
    }
  }

  .animate-float {
    animation: float 8s ease-in-out infinite;
  }

  .animate-float-delayed {
    animation: float 8s ease-in-out infinite;
    animation-delay: -4s;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-float,
    .animate-float-delayed {
      animation: none;
    }
  }
</style>
