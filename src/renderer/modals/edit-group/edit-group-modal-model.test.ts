// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildGroupEditImageSelections,
	isGroupImageUploadRole,
} from "./edit-group-modal-model";
import type { EditGroupGallerySelections } from "./edit-group-modal-types";

describe(
	"edit-group-modal-model",
	() => {
		it(
			"builds group edit image selections without thumbnail state",
			() => {
				const selections: EditGroupGallerySelections = {
					portrait:  "portrait-candidate",
					banner:    "banner-candidate",
					thumbnail: "thumbnail-candidate",
				};

				expect(buildGroupEditImageSelections(selections)).toEqual([
					{
						role:         "portrait",
						candidateKey: "portrait-candidate",
					},
					{
						role:         "banner",
						candidateKey: "banner-candidate",
					},
				]);
			},
		);

		it(
			"allows uploads only for group-owned image roles",
			() => {
				expect(isGroupImageUploadRole("portrait")).toBe(true);
				expect(isGroupImageUploadRole("banner")).toBe(true);
				expect(isGroupImageUploadRole("thumbnail")).toBe(false);
			},
		);
	},
);
