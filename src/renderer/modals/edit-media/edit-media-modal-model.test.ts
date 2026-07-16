// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildMediaEditImageSelections,
	isMediaImageUploadRole,
} from "./edit-media-modal-model";
import type { EditMediaGallerySelections } from "./edit-media-modal-types";

describe(
	"edit-media-modal-model",
	() => {
		it(
			"builds media edit image selections without thumbnail state",
			() => {
				const selections: EditMediaGallerySelections = {
					portrait:  "portrait-user-upload",
					banner:    undefined,
					thumbnail: "thumbnail-derived",
				};

				expect(buildMediaEditImageSelections(selections)).toEqual([
					{
						role:         "portrait",
						candidateKey: "portrait-user-upload",
					},
					{
						role:         "banner",
						candidateKey: undefined,
					},
				]);
			},
		);

		it(
			"allows uploads only for media-owned image roles",
			() => {
				expect(isMediaImageUploadRole("portrait")).toBe(true);
				expect(isMediaImageUploadRole("banner")).toBe(true);
				expect(isMediaImageUploadRole("thumbnail")).toBe(false);
			},
		);
	},
);
