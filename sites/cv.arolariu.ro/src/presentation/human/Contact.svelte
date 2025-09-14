<script lang="ts">
  import {AnimatedSection} from "@/components/motion";
  import {author} from "@/data";

  let formData = $state({
    name: "",
    email: "",
    message: "",
  });

  let isSubmitting = $state(false);
  let submitMessage = $state("");
  let focusedField = $state("");

  async function handleSubmit(event: Event) {
    event.preventDefault();
    const subject = `[cv.arolariu.ro] - ${formData.name}`;
    const body = `Hello,\n\n${formData.message}\n\n— ${formData.name}\n${formData.email}`;
    const mailtoUrl = `mailto:${author.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }

  const contactInfo = [
    {
      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
      title: "Location",
      value: author.location,
    },
    {
      icon: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      title: "Email",
      value: author.email,
    },
    {
      icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6",
      title: "Website",
      value: author.website,
    },
  ];
</script>

<section
  id="contact"
  class="py-16 px-6 relative overflow-hidden">
  <!-- Theme-aware gradient background -->
  <div
    class="absolute inset-0 transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4"
  ></div>

  <div class="container mx-auto relative z-10">
    <AnimatedSection
      id="contact-title"
      animation="fade-up">
      <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">
        Get In <span class="text-blue-600 dark:text-blue-400">Touch</span>
      </h2>
    </AnimatedSection>

    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12">
        <!-- Contact Information -->
        <AnimatedSection
          id="contact-info"
          animation="fade-right"
          delay={200}>
          <div class="backdrop-blur-sm rounded-xl p-8 shadow-lg transition-all duration-300 bg-white/80 dark:bg-black/40">
            <h3 class="text-2xl font-semibold mb-6 text-blue-600 dark:text-blue-400"> Let's Connect </h3>
            <p class="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              I'm always interested in new opportunities and exciting projects. Whether you have a question, want to collaborate, or just
              want to say hello, feel free to reach out!
            </p>

            <div class="space-y-6">
              {#each contactInfo as info, index}
                <div
                  class="flex items-center hover-lift stagger-animation"
                  style="--delay: {400 + index * 100}ms">
                  <div
                    class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-4 hover-scale hover-glow">
                    <svg
                      class="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={info.icon}></path>
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-gray-900 dark:text-white font-semibold">{info.title}</h4>
                    <p class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                      {info.value}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </AnimatedSection>

        <!-- Contact Form -->
        <AnimatedSection
          id="contact-form"
          animation="fade-left"
          delay={400}>
          <div class="backdrop-blur-sm rounded-xl p-8 shadow-lg transition-all duration-300 bg-white/80 dark:bg-black/40">
            <form
              onsubmit={handleSubmit}
              class="space-y-6">
              <div class="relative">
                <label
                  for="name"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200 {focusedField
                  === 'name'
                    ? 'text-blue-600 dark:text-blue-400'
                    : ''}">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  bind:value={formData.name}
                  onfocus={() => (focusedField = "name")}
                  onblur={() => (focusedField = "")}
                  required
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="Your Name" />
              </div>

              <div class="relative">
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200 {focusedField
                  === 'email'
                    ? 'text-blue-600 dark:text-blue-400'
                    : ''}">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  bind:value={formData.email}
                  onfocus={() => (focusedField = "email")}
                  onblur={() => (focusedField = "")}
                  required
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="your.email@example.com" />
              </div>

              <div class="relative">
                <label
                  for="message"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200 {focusedField
                  === 'message'
                    ? 'text-blue-600 dark:text-blue-400'
                    : ''}">
                  Message
                </label>
                <textarea
                  id="message"
                  bind:value={formData.message}
                  onfocus={() => (focusedField = "message")}
                  onblur={() => (focusedField = "")}
                  required
                  rows="5"
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="Your message..."></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-800 disabled:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover-lift hover-glow transform hover:scale-105 disabled:hover:scale-100 disabled:hover:transform-none relative overflow-hidden cursor-pointer">
                {#if isSubmitting}
                  <span class="flex items-center justify-center">
                    <svg
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                {:else}
                  Send Message
                {/if}
              </button>

              {#if submitMessage}
                <div class="text-green-600 dark:text-green-400 text-center animate-pulse">
                  {submitMessage}
                </div>
              {/if}
            </form>
          </div>
        </AnimatedSection>
      </div>
    </div>
  </div>
</section>
