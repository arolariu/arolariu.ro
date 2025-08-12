<script lang="ts">
	import { AnimatedSection } from '@/components/motion';
	import { biography } from '@/data';
</script>

<section id="about" class="py-16 px-6 relative overflow-hidden">
	<div
		class="absolute inset-0 transition-all duration-500 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4"
	></div>

	<div class="container mx-auto relative z-10">
		<AnimatedSection id="about-title" animation="fade-up">
			<div class="mb-12 text-center">
				<h2 id="about-heading" class="font-bold text-3xl">
					About <span class="text-blue-600 dark:text-blue-400">Me</span>
				</h2>
			</div>
		</AnimatedSection>

		<div class="max-w-6xl mx-auto">
			<div class="grid md:grid-cols-2 gap-12 items-start">
				<AnimatedSection id="about-left" animation="fade-right" delay={200}>
					<div
						class="backdrop-blur-sm rounded-xl p-8 shadow-lg hover-lift border border-gray-200 dark:border-gray-700 transition-all duration-300 bg-white/80 dark:bg-black/40"
					>
						<div class="mb-6">
							<h3 id="about-professional" class="font-bold text-2xl">
								Professional <span class="text-blue-600 dark:text-blue-400">Journey</span>
							</h3>
						</div>
						<div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
							<p>{biography.firstPoint}</p>
							<p>{biography.secondPoint}</p>
						</div>
					</div>
				</AnimatedSection>

				<AnimatedSection id="about-right" animation="fade-left" delay={400}>
					<div
						class="backdrop-blur-sm rounded-xl p-8 shadow-lg hover-lift border border-gray-200 dark:border-gray-700 transition-all duration-300 bg-white/80 dark:bg-black/40"
					>
						<div class="mb-6">
							<h3 id="about-interests" class="font-bold text-2xl">
								Interests <span class="text-blue-600 dark:text-blue-400">& Passion</span>
							</h3>
						</div>
						<div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
							<p>{biography.thirdPoint}</p>
							<p>{biography.fourthPoint}</p>
						</div>
					</div>
				</AnimatedSection>
			</div>

			<AnimatedSection id="about-collaboration" animation="fade-up" delay={600}>
				<div
					class="mt-12 backdrop-blur-sm rounded-xl p-8 shadow-lg text-center border border-gray-200 dark:border-gray-700 transition-all duration-300 bg-gradient-to-br from-blue-500/5 via-purple-500/4 to-pink-500/3 dark:from-blue-500/8 dark:via-purple-500/6 dark:to-pink-500/4"
				>
					<div class="mb-4 text-center">
						<h3 id="about-collaboration-heading" class="font-bold text-2xl">
							Open for <span class="text-blue-600 dark:text-blue-400">Collaboration</span>
						</h3>
					</div>
					<p class="text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto">
						{biography.fifthPoint}
					</p>
				</div>
			</AnimatedSection>
		</div>
	</div>
</section>
