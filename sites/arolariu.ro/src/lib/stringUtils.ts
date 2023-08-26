/**
 * This function will capitalize the first letter of every word in a given sentence.
 * @param text The text to capitalize.
 * @returns The capitalized text.
 */
export function capitalizeWords(text: string): string {
	text = text.toLowerCase();
	let words = text.split(" ");
	let capitalizedWords = words.map((word) => {
		return word.charAt(0).toUpperCase() + word.slice(1);
	});
	return capitalizedWords.join(" ");
}

/**
 * The `first15` function will retrieve the first 15 characters of a given sentence.
 * The function will split the sentence into words and will try to return full words.
 * The function will NOT return partial words, if the length of constructed sentence is more than 15 characters.
 * @param text The sentence to split into words and return the first 15 characters.
 * @returns The first 15 characters of the given sentence. (ONLY FULL WORDS)
 */
export function first15(text: string): string {
	if (text.length > 15) {
		const stringParts = text.split(" ");
		if (stringParts[0].length > 15) {
			return stringParts[0].substring(0, 15).concat("...");
		} else {
			const firstAndSecond = stringParts[0].concat(" ").concat(stringParts[1]);
			if (firstAndSecond.length > 15) {
				return stringParts[0];
			} else {
				return firstAndSecond;
			}
		}
	} else {
		return text;
	}
}
