const SEARCH_KEY_SEGMENT_SEPARATOR = " ";

const SPECIAL_SEARCH_CHARACTER_REPLACEMENTS: Record<string, string> = {
	"ß": "ss",
	"ẞ": "ss",
	"æ": "ae",
	"Æ": "ae",
	"œ": "oe",
	"Œ": "oe",
	"ø": "o",
	"Ø": "o",
	"đ": "d",
	"Đ": "d",
	"ł": "l",
	"Ł": "l",
};

// Library search keys are intentionally lossy: they strip accents, case, spaces,
// and punctuation so user input such as "pokemon" can match "Pokémon" and title
// variants with separators without pushing that normalization into renderer code.
export function createSearchKey(value: string | null | undefined): string {
	if (!value) {
		return "";
	}

	return value
		.replace(
			/[ßẞæÆœŒøØđĐłŁ]/g,
			(character) => SPECIAL_SEARCH_CHARACTER_REPLACEMENTS[ character ] ?? character,
		)
		.normalize("NFKD")
		.replace(
			/\p{Mark}/gu,
			"",
		)
		.toLocaleLowerCase()
		.replace(
			/[^\p{Letter}\p{Number}]+/gu,
			"",
		);
}

// Media can have multiple provider title variants. Keeping all normalized keys in
// one stored column makes the DB search accent-insensitive without changing which
// title is selected for display.
export function createCombinedSearchKey(values: readonly (string | null | undefined)[]): string {
	const seen = new Set<string>();
	const keys: string[] = [];

	for (const value of values) {
		const key = createSearchKey(value);
		if (!key || seen.has(key)) {
			continue;
		}
		seen.add(key);
		keys.push(key);
	}

	return keys.join(SEARCH_KEY_SEGMENT_SEPARATOR);
}
