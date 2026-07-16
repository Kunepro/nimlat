// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyMediaDetailsWatchedState,
	createGenreLibraryFilterSearch,
	createTagLibraryFilterSearch,
	formatMediaDetailsLoadError,
	resolveMediaDetailsGroupSource,
} from "./media-details-explorer-model";

describe(
	"media-details-explorer-model",
	() => {
		it(
			"accepts only supported media group sources",
			() => {
				expect(resolveMediaDetailsGroupSource("official")).toBe("official");
				expect(resolveMediaDetailsGroupSource("user")).toBe("user");
				expect(resolveMediaDetailsGroupSource("invalid")).toBeUndefined();
				expect(resolveMediaDetailsGroupSource(undefined)).toBeUndefined();
			},
		);

		it(
			"builds library filter search payloads for taxonomy clicks",
			() => {
				expect(createGenreLibraryFilterSearch("Drama")).toEqual({
					genreNames: [ "Drama" ],
					tagNames:   undefined,
				});
				expect(createTagLibraryFilterSearch("Time Skip")).toEqual({
					genreNames: undefined,
					tagNames:   [ "Time Skip" ],
				});
			},
		);

		it(
			"formats media details load errors safely",
			() => {
				expect(formatMediaDetailsLoadError(new Error("Media unavailable"))).toBe("Media unavailable");
				expect(formatMediaDetailsLoadError("bad value")).toBe("Failed to load media details.");
			},
		);

		it(
			"applies optimistic watched state only to the inspected media",
			() => {
				const media = {
					mediaId:   9,
					name:      "Current media",
					isWatched: false,
				};

				expect(applyMediaDetailsWatchedState(
					media,
					9,
					true,
				)).toEqual({
					mediaId:   9,
					name:      "Current media",
					isWatched: true,
				});
				expect(applyMediaDetailsWatchedState(
					media,
					10,
					true,
				)).toBe(media);
				expect(applyMediaDetailsWatchedState(
					null,
					9,
					true,
				)).toBeNull();
			},
		);
	},
);
