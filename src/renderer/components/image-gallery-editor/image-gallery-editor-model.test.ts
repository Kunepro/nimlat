// @vitest-environment node

import type { ImageGalleryCandidate } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	canDeleteImageGalleryCandidate,
	getImageGalleryCandidatePreviewUrl,
	getImageGalleryEmptyDescription,
	isImageGalleryCandidateSelected,
	isPortraitImageGalleryRole,
} from "./image-gallery-editor-model";

const baseCandidate: ImageGalleryCandidate = {
	candidateKey: "candidate-1",
	role:         "portrait",
	sourceKind:   "provider",
	label:        "AniList poster",
	imageUrl:     "https://example.test/source.jpg",
};

describe(
	"image-gallery-editor-model",
	() => {
		it(
			"prefers display images over source images",
			() => {
				expect(getImageGalleryCandidatePreviewUrl({
					...baseCandidate,
					displayImageUrl: "nimlat://image-cache/display.jpg",
				})).toBe("nimlat://image-cache/display.jpg");
				expect(getImageGalleryCandidatePreviewUrl(baseCandidate)).toBe("https://example.test/source.jpg");
			},
		);

		it(
			"detects the active candidate for a tab",
			() => {
				expect(isImageGalleryCandidateSelected(
					{
						role:               "portrait",
						title:              "Posters",
						activeCandidateKey: "candidate-1",
						candidates:         [ baseCandidate ],
					},
					baseCandidate,
				)).toBe(true);
			},
		);

		it(
			"allows deleting only user-upload candidates when a handler is present",
			() => {
				expect(canDeleteImageGalleryCandidate(
					{
						...baseCandidate,
						sourceKind: "user_upload",
					},
					true,
				)).toBe(true);
				expect(canDeleteImageGalleryCandidate(
					{
						...baseCandidate,
						sourceKind: "user_upload",
					},
					false,
				)).toBe(false);
				expect(canDeleteImageGalleryCandidate(
					baseCandidate,
					true,
				)).toBe(false);
			},
		);

		it(
			"formats empty copy and role layout checks",
			() => {
				expect(getImageGalleryEmptyDescription("Banners")).toBe("No banners images available yet.");
				expect(isPortraitImageGalleryRole("portrait")).toBe(true);
				expect(isPortraitImageGalleryRole("banner")).toBe(false);
			},
		);
	},
);
