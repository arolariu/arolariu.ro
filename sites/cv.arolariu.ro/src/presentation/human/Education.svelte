<script lang="ts">
	import { AnimatedSection } from '@/components/motion';
	import { certificationsAsArray } from '@/data/certifications';
	import { educationAsArray } from '@/data/education';
</script>

<section id="education" class="py-16 px-6">
	<div class="container mx-auto">
		<AnimatedSection id="education-title" animation="fade-up">
			<div class="mb-12 text-center">
				<h2 id="education-heading" class="font-bold text-3xl">
					Education <span class="text-blue-600 dark:text-blue-400">& Certifications</span>
				</h2>
			</div>
		</AnimatedSection>

		<div class="max-w-6xl mx-auto">
			<!-- Education -->
			<div class="mb-16">
				<div class="mb-8 text-center text-gray-800 dark:text-gray-200">
					<h3 id="academic-background" class="font-bold text-2xl">
						Academic <span class="text-blue-600 dark:text-blue-400">Background</span>
					</h3>
				</div>
				<div class="space-y-8">
					{#each educationAsArray as education, index}
						<AnimatedSection id="education-{index}" animation="fade-up" delay={index * 200}>
							<div
								class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 shadow-lg hover-lift border border-gray-200/50 dark:border-gray-700/50"
							>
								<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
									<div class="flex-1">
										<h4 class="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
											{education.degree}
										</h4>
										<p class="text-lg text-gray-800 dark:text-gray-200 mb-1">
											{education.institution}
										</p>
										<p class="text-gray-600 dark:text-gray-400 mb-4">{education.location}</p>
										<p class="text-gray-700 dark:text-gray-300 leading-relaxed">
											{education.description}
										</p>
									</div>
									<div class="lg:ml-8 mt-4 lg:mt-0 flex flex-col items-end">
										<div
											class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-2"
										>
											{education.period}
										</div>
										<span
											class="text-sm px-3 py-1 rounded-full {education.status === 'Completed'
												? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
												: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}"
										>
											{education.status}
										</span>
									</div>
								</div>
							</div>
						</AnimatedSection>
					{/each}
				</div>
			</div>

			<!-- Certifications -->
			<div>
				<div class="mb-8 text-center text-gray-800 dark:text-gray-200">
					<h3 id="professional-certifications" class="font-bold text-2xl">
						Professional <span class="text-blue-600 dark:text-blue-400">Certifications</span>
					</h3>
				</div>
				<div class="grid md:grid-cols-2 gap-8">
					{#each certificationsAsArray as cert, index}
						<AnimatedSection id="cert-{index}" animation="fade-up" delay={index * 200}>
							<div
								class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-xl p-6 shadow-lg hover-lift border border-blue-200/50 dark:border-blue-700/50"
							>
								<div class="flex items-start justify-between mb-4">
									<div class="flex-1">
										<h4 class="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
											{cert.name}
										</h4>
										<p class="text-gray-600 dark:text-gray-400 text-sm mb-2">Code: {cert.code}</p>
										<p class="text-gray-800 dark:text-gray-200 font-medium">{cert.issuer}</p>
									</div>
									<span class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
										{cert.issueDate}
									</span>
								</div>
								<p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
									{cert.description}
								</p>
							</div>
						</AnimatedSection>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>
