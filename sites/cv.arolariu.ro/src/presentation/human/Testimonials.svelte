<script lang="ts">
	import { AnimatedSection } from '@/components/motion';
	import { testimonialsAsArray } from '@/data/testimonials';
</script>

<section id="testimonials" class="py-16 px-6">
	<div class="container mx-auto">
		<AnimatedSection id="testimonials-title" animation="fade-up">
			<div class="mb-12 text-center">
				<h2 id="testimonials-heading" class="font-bold text-3xl">
					What <span class="text-blue-600 dark:text-blue-400">Colleagues Say</span>
				</h2>
				<p class="mt-3 text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-sm">
					Authentic testimonials from Microsoft colleagues who have worked alongside Alexandru.
				</p>
			</div>
		</AnimatedSection>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each testimonialsAsArray as testimonial, index}
				<AnimatedSection animation="fade-up" delay={100 * index}>
					<div
						class="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col"
					>
						<!-- Quote Icon -->
						<div class="flex justify-center mb-4">
							<svg
								class="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-50"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"
								/>
							</svg>
						</div>

						<!-- Testimonial Content -->
						<div class="text-center flex-grow flex flex-col justify-center">
							<blockquote
								class="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 italic"
							>
								"{testimonial.quote}"
							</blockquote>
						</div>

						<div class="flex flex-col items-center mt-auto pt-6">
							<div
								class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-3 hover-scale"
							>
								<span class="text-white font-bold text-lg">
									{testimonial.author.charAt(0)}
								</span>
							</div>
							<h4 class="font-semibold text-gray-900 dark:text-white text-base">
								{testimonial.author}
							</h4>
							<p class="text-blue-600 dark:text-blue-400 font-medium text-sm">
								{testimonial.position}
							</p>
							<p class="text-gray-600 dark:text-gray-400 text-xs">
								{testimonial.company}
							</p>
						</div>
					</div>
				</AnimatedSection>
			{/each}
		</div>
	</div>
</section>
