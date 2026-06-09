/**
 * @fileoverview Recipe fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/recipeFixtures
 */

import type {Recipe, RecipeComplexity} from "@/types/invoices/Recipe";

/**
 * Easy recipe fixture - simple meal with few ingredients.
 */
export const storyRecipeEasy: Recipe = {
	name: "Classic Scrambled Eggs",
	description: "Quick and easy breakfast with fluffy scrambled eggs",
	approximateTotalDuration: 10,
	complexity: 1 as RecipeComplexity, // Easy
	ingredients: ["Eggs", "Butter", "Salt", "Pepper", "Milk"],
	instructions:
		"1. Crack eggs into a bowl and whisk with milk, salt, and pepper\n" +
		"2. Melt butter in a non-stick pan over medium heat\n" +
		"3. Pour egg mixture into the pan\n" +
		"4. Stir gently with a spatula until eggs are set but still soft\n" +
		"5. Serve immediately while hot",
	preparationTime: 3,
	cookingTime: 7,
	referenceForMoreDetails: "https://www.example.com/recipes/scrambled-eggs",
};

/**
 * Hard recipe fixture - complex meal requiring advanced techniques.
 */
export const storyRecipeHard: Recipe = {
	name: "Beef Wellington",
	description: "Classic British dish with beef tenderloin wrapped in puff pastry",
	approximateTotalDuration: 180,
	complexity: 3 as RecipeComplexity, // Hard
	ingredients: [
		"Beef Tenderloin",
		"Puff Pastry",
		"Mushrooms",
		"Shallots",
		"Garlic",
		"Thyme",
		"Dijon Mustard",
		"Egg Yolk",
		"Butter",
		"Olive Oil",
		"Salt",
		"Black Pepper",
		"Parma Ham",
	],
	instructions:
		"1. Season beef tenderloin with salt and pepper, sear all sides in hot pan\n" +
		"2. Brush seared beef with Dijon mustard and let cool\n" +
		"3. Sauté finely chopped mushrooms, shallots, and garlic until dry (duxelles)\n" +
		"4. Roll out puff pastry and layer with Parma ham\n" +
		"5. Spread duxelles over ham, place beef in center\n" +
		"6. Wrap pastry tightly around beef, seal edges with egg wash\n" +
		"7. Brush entire surface with egg yolk\n" +
		"8. Bake at 200°C for 40-45 minutes until pastry is golden\n" +
		"9. Rest for 10 minutes before slicing and serving",
	preparationTime: 60,
	cookingTime: 120,
	referenceForMoreDetails: "https://www.example.com/recipes/beef-wellington",
};

/**
 * Normal complexity recipe fixture - moderate skill level.
 */
export const storyRecipeNormal: Recipe = {
	name: "Spaghetti Carbonara",
	description: "Traditional Italian pasta with eggs, cheese, and pancetta",
	approximateTotalDuration: 25,
	complexity: 2 as RecipeComplexity, // Normal
	ingredients: ["Spaghetti", "Pancetta", "Eggs", "Parmesan Cheese", "Pecorino Romano", "Black Pepper", "Salt"],
	instructions:
		"1. Cook spaghetti in salted boiling water until al dente\n" +
		"2. Dice pancetta and fry until crispy\n" +
		"3. Whisk eggs with grated Parmesan and Pecorino cheese\n" +
		"4. Reserve 1 cup pasta water, then drain pasta\n" +
		"5. Add hot pasta to pancetta pan (off heat)\n" +
		"6. Pour egg mixture over pasta, toss quickly\n" +
		"7. Add pasta water gradually to create creamy sauce\n" +
		"8. Season with black pepper and serve immediately",
	preparationTime: 10,
	cookingTime: 15,
	referenceForMoreDetails: "https://www.example.com/recipes/carbonara",
};

/**
 * Array of multiple recipe fixtures for list/grid stories.
 */
export const storyRecipes: Recipe[] = [storyRecipeEasy, storyRecipeNormal, storyRecipeHard];
