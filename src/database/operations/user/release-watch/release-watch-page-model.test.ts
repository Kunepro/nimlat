// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createPastReleaseWatchPage,
	createUpcomingReleaseWatchPage,
} from "./release-watch-page-model";
import type { ReleaseWatchStateRow } from "./user-release-watch-shared";

function createReleaseWatchStateRow(
	mediaId: number,
	overrides: Partial<ReleaseWatchStateRow> = {},
): ReleaseWatchStateRow {
	return {
		mediaId,
		watchDomain:          "past",
		state:                "released_needs_integration",
		resolvedReleaseAt:    1_000,
		releaseDatePrecision: "timestamp",
		releaseDateSource:    "provider_release_at",
		integrationStatus:    "tracked",
		integrationPercent:   40,
		payloadJson:          "{\"kind\":\"fixture\"}",
		updatedAt:            2_000,
		name:                 "Release Row",
		format:               "TV",
		...overrides,
	};
}

describe(
	"release-watch-page-model",
	() => {
		it(
			"maps past rows with payload parsing and normalized pagination",
			() => {
				const page = createPastReleaseWatchPage(
					[
						createReleaseWatchStateRow(101),
					],
					3,
					0.8,
				);

				expect(page).toEqual({
					items:      [
						expect.objectContaining({
							mediaId:           101,
							watchDomain:       "past",
							name:              "Release Row",
							integrationStatus: "tracked",
							payload:           { kind: "fixture" },
						}),
					],
					total:      3,
					nextOffset: 1,
				});
			},
		);

		it(
			"maps upcoming rows with fallback name and invalid payload protection",
			() => {
				const page = createUpcomingReleaseWatchPage(
					[
						createReleaseWatchStateRow(
							202,
							{
								watchDomain: "upcoming",
								state:       "upcoming_media_release",
								name:        null,
								payloadJson: "not-json",
							},
						),
					],
					1,
					0,
				);

				expect(page).toEqual({
					items:      [
						expect.objectContaining({
							mediaId:     202,
							watchDomain: "upcoming",
							name:        "Media 202",
							payload:     undefined,
						}),
					],
					total:      1,
					nextOffset: null,
				});
			},
		);
	},
);
