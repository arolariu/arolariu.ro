<script lang="ts">
	import Footer from '@/presentation/Footer.svelte';
	import Header from '@/presentation/Header.svelte';
	import About from '@/presentation/human/About.svelte';
	import Competencies from '@/presentation/human/Competencies.svelte';
	import Contact from '@/presentation/human/Contact.svelte';
	import Education from '@/presentation/human/Education.svelte';
	import Experience from '@/presentation/human/Experience.svelte';
	import Hero from '@/presentation/human/Hero.svelte';
	import Skills from '@/presentation/human/Skills.svelte';
	import Testimonials from '@/presentation/human/Testimonials.svelte';
</script>

<main id="main" class="min-h-screen relative bg-white dark:bg-black transition-colors duration-300">
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
