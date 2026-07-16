// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	isSupportedAnimatedAniListMedia,
	isSupportedAnimatedMediaFormat,
} from "./supported-media-formats";

describe(
	"supported-media-formats",
	() => {
		it(
			"accepts only the animated formats Nimlat supports",
			() => {
				expect(isSupportedAnimatedMediaFormat("TV")).toBe(true);
				expect(isSupportedAnimatedMediaFormat("ONA")).toBe(true);
				expect(isSupportedAnimatedMediaFormat("MUSIC")).toBe(false);
				expect(isSupportedAnimatedMediaFormat("MANGA")).toBe(false);
				expect(isSupportedAnimatedMediaFormat("NOVEL")).toBe(false);
				expect(isSupportedAnimatedMediaFormat(undefined)).toBe(false);
			},
		);

		it(
			"requires both anime type and a supported animated format",
			() => {
				expect(isSupportedAnimatedAniListMedia({
					type:   "ANIME",
					format: "MOVIE",
				})).toBe(true);
				expect(isSupportedAnimatedAniListMedia({
					type:   "ANIME",
					format: "MUSIC",
				})).toBe(false);
				expect(isSupportedAnimatedAniListMedia({
					type:   "MANGA",
					format: "TV",
				})).toBe(false);
			},
		);
	},
);
