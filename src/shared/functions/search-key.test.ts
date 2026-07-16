import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createCombinedSearchKey,
	createSearchKey,
} from "./search-key";

describe(
	"search-key",
	() => {
		it(
			"normalizes case, accents, and separators into one searchable key",
			() => {
				expect(createSearchKey("Pokémon")).toBe("pokemon");
				expect(createSearchKey("pokèmon")).toBe("pokemon");
				expect(createSearchKey("POKEMON: The Series")).toBe("pokemontheseries");
				expect(createSearchKey("Kaguya-sama: Love is War")).toBe("kaguyasamaloveiswar");
			},
		);

		it(
			"keeps distinct media title variants in one stable DB search value",
			() => {
				expect(createCombinedSearchKey([
					"Pokémon",
					"Pokemon",
					"Pocket Monsters",
				])).toBe("pokemon pocketmonsters");
			},
		);
	},
);
