// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	formatImageGalleryError,
	getInitialGallerySelections,
	mergeGalleryTabs,
	restoreDeletedGallerySelectionFallback,
	selectGalleryCandidate,
} from "./image-gallery-modal.utils";

describe(
	"image-gallery-modal.utils",
	() => {
		it(
			"snapshots and merges active gallery selections by role",
			() => {
				const tabs = [
					{
						role:               "portrait" as const,
						title:              "Portrait",
						activeCandidateKey: "portrait:1",
						candidates:         [],
					},
					{
						role:               "banner" as const,
						title:              "Banner",
						activeCandidateKey: "banner:1",
						candidates:         [],
					},
				];

				expect(getInitialGallerySelections(tabs)).toEqual({
					portrait:  "portrait:1",
					banner:    "banner:1",
					thumbnail: undefined,
				});
				expect(mergeGalleryTabs(
					tabs,
					{
						portrait:  "portrait:2",
						banner:    undefined,
						thumbnail: "thumbnail:2",
					},
				)).toEqual([
					{
						...tabs[ 0 ],
						activeCandidateKey: "portrait:2",
					},
					{
						...tabs[ 1 ],
						activeCandidateKey: undefined,
					},
				]);
			},
		);

		it(
			"updates draft selections and falls back when deleting the selected upload",
			() => {
				const current  = {
					portrait:  "upload:7",
					banner:    "provider:banner",
					thumbnail: undefined,
				};
				const defaults = {
					portrait:  "provider:portrait",
					banner:    "provider:banner-default",
					thumbnail: undefined,
				};

				expect(selectGalleryCandidate(
					current,
					"banner",
					"upload:8",
				)).toEqual({
					...current,
					banner: "upload:8",
				});
				expect(restoreDeletedGallerySelectionFallback(
					current,
					defaults,
					"portrait",
					"upload:7",
				)).toEqual({
					...defaults,
					portrait: "provider:portrait",
				});
				expect(restoreDeletedGallerySelectionFallback(
					current,
					defaults,
					"banner",
					"upload:7",
				)).toEqual({
					...defaults,
					banner: "provider:banner",
				});
			},
		);

		it(
			"formats gallery errors with a fallback",
			() => {
				expect(formatImageGalleryError(
					new Error("Disk full"),
					"Failed",
				)).toBe("Disk full");
				expect(formatImageGalleryError(
					"bad value",
					"Failed",
				)).toBe("Failed");
			},
		);
	},
);
