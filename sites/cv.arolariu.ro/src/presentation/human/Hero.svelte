<script lang="ts">
  import {author} from "@/data";
  let heroVisible = $state(false);
  let buttonsVisible = $state(false);
  let typingComplete = $state(false);

  // Trigger hero animation shortly after mount
  $effect(() => {
    const t = setTimeout(() => (heroVisible = true), 300);
    return () => clearTimeout(t);
  });

  // React to typing completion via centralized animation state
  $effect(() => {
    if (typingComplete) {
      const t = setTimeout(() => (buttonsVisible = true), 500);
      return () => clearTimeout(t);
    }
    return () => {};
  });
</script>

<section class="pt-24 pb-16 px-6 relative overflow-hidden">
  <!-- Theme-aware animated gradient background elements -->
  <div class="absolute inset-0 overflow-hidden">
    <div
      class="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse transition-all duration-500 bg-gradient-to-tr from-blue-500/10 via-purple-500/8 to-pink-500/5 dark:from-blue-500/15 dark:via-purple-500/10 dark:to-pink-500/5"
    ></div>
    <div
      class="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse transition-all duration-500 bg-gradient-to-tr from-pink-500/10 via-purple-500/8 to-blue-500/5 dark:from-pink-500/15 dark:via-purple-500/10 dark:to-blue-500/5"
      style="animation-delay: 2s;"></div>
  </div>

  <div class="container mx-auto text-center relative z-10">
    <div class="mb-8">
      <img
        src="/author.jpeg"
        alt={author.name}
        class="w-48 h-48 rounded-full mx-auto mb-6 border-4 border-blue-500 dark:border-blue-400 shadow-xl hover-lift transition-all duration-500 {heroVisible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-90'}" />
    </div>

    <div class="transition-all duration-800 {heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}">
      <h1 class="text-4xl md:text-6xl font-bold mb-4">
        Alexandru-Razvan
        <span class="text-blue-600 dark:text-blue-400"> Olariu </span>
      </h1>
    </div>

    <div class="transition-all duration-800 delay-300 {heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}">
      <p class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-6"> Software Engineer | Solution Architect | Mentor </p>
    </div>

    <div class="transition-all duration-800 delay-500 {heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}">
      <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
        {new Date().getFullYear() - 2000}-year-old passionate software engineer based in {author.location}, dedicated to creating innovative
        solutions and building exceptional digital experiences.
      </p>
    </div>

    <div
      class="flex flex-col sm:flex-row gap-4 justify-center transition-all duration-800 {buttonsVisible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-8'}">
      <a
        href="#contact"
        class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover-lift hover-glow transform hover:scale-105">
        Get In Touch
      </a>
      <a
        href="#experience"
        class="border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:text-gray-900 px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover-lift transform hover:scale-105">
        View My Work
      </a>
    </div>
  </div>
</section>

<style>
  .hover-lift {
    transition: transform 0.3s ease;
  }

  .hover-lift:hover {
    transform: translateY(-4px);
  }

  .hover-glow {
    transition: box-shadow 0.3s ease;
  }

  .hover-glow:hover {
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.2);
  }
</style>
