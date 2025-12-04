<!--
@component HumanView

Interactive, human-readable CV view with modern web design and animations.

@remarks
**Rendering Context**: SvelteKit page component (SSR + hydration).

**Purpose**: Displays the CV in a visually engaging, interactive format
optimized for viewing on screens rather than printing.

**Composition**: Assembles multiple presentation sections into a cohesive
single-page layout with smooth scrolling between sections.

**Sections Rendered** (in order):
1. Header - Navigation and branding
2. Hero - Name, title, and call-to-action
3. About - Professional summary
4. Skills - Technical and soft skills
5. Experience - Work history timeline
6. Education - Academic background
7. Competencies - Core competency highlights
8. Testimonials - Professional recommendations
9. Contact - Contact information and form
10. Footer - Links and copyright

**Theming**: Supports light/dark mode via Tailwind `dark:` variants.
Background transitions smoothly between `bg-white` and `bg-black`.

**Accessibility**: Each section is a semantic HTML element.
Full keyboard navigation supported.

@example
```svelte
<HumanView />
```

@see {@link Header} for navigation component
@see {@link Hero} for the hero section
-->
<script lang="ts">
  import Footer from "@/presentation/Footer.svelte";
  import Header from "@/presentation/Header.svelte";
  import About from "@/presentation/human/About.svelte";
  import Competencies from "@/presentation/human/Competencies.svelte";
  import Contact from "@/presentation/human/Contact.svelte";
  import Education from "@/presentation/human/Education.svelte";
  import Experience from "@/presentation/human/Experience.svelte";
  import Hero from "@/presentation/human/Hero.svelte";
  import Skills from "@/presentation/human/Skills.svelte";
  import Testimonials from "@/presentation/human/Testimonials.svelte";
</script>

<main
  id="main"
  class="min-h-screen relative bg-white dark:bg-black transition-colors duration-300">
  <Header />
  <Hero />
  <About />
  <Skills />
  <Experience />
  <Education />
  <Competencies />
  <Testimonials />
  <Contact />
  <Footer />
</main>
