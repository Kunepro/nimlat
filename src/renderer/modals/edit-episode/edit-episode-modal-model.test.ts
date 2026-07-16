// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildEpisodeEditImageSelections,
	isEpisodeThumbnailUploadRole,
} from "./edit-episode-modal-model";
import type { EditEpisodeGallerySelections } from "./edit-episode-modal-types";

describe(
	"edit-episode-modal-model",
	() => {
		it(
			"builds episode edit image selections with thumbnail only",
			() => {
				const selections: EditEpisodeGallerySelections = {
					portrait:  "portrait-candidate",
					banner:    "banner-candidate",
					thumbnail: "thumbnail-candidate",
				};

				expect(buildEpisodeEditImageSelections(selections)).toEqual([
					{
						role:         "thumbnail",
						candidateKey: "thumbnail-candidate",
					},
				]);
			},
		);

		it(
			"allows uploads only for episode thumbnail images",
			() => {
				expect(isEpisodeThumbnailUploadRole("thumbnail")).toBe(true);
				expect(isEpisodeThumbnailUploadRole("portrait")).toBe(false);
				expect(isEpisodeThumbnailUploadRole("banner")).toBe(false);
			},
		);
	},
);
