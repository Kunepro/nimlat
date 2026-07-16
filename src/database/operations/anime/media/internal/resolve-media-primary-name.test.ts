import {
	describe,
	expect,
	it,
} from "vitest";
import { resolveMediaPrimaryName } from "./resolve-media-primary-name";

describe(
	"resolveMediaPrimaryName",
	() => {
		it(
			"prefers english when available",
			() => {
				expect(resolveMediaPrimaryName({
					english: "FAIRY TAIL OVA",
					romaji:  "Fairy Tail OVA",
					native:  "FAIRY TAIL OVA",
				})).toBe("FAIRY TAIL OVA");
			},
		);

		it(
			"falls back to romaji when english is missing",
			() => {
				expect(resolveMediaPrimaryName({
					english: null,
					romaji:  "Ye Xing Xia Ying",
					native:  "夜刑侠影",
				})).toBe("Ye Xing Xia Ying");
			},
		);

		it(
			"falls back to native when english and romaji are missing",
			() => {
				expect(resolveMediaPrimaryName({
					english: null,
					romaji:  null,
					native:  "夜刑侠影",
				})).toBe("夜刑侠影");
			},
		);

		it(
			"returns null when all AniList title variants are missing",
			() => {
				expect(resolveMediaPrimaryName({
					english: null,
					romaji:  null,
					native:  null,
				})).toBeNull();
			},
		);
	},
);
