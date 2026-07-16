import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyAnimeDbUpdateBatchEvent,
	applyAnimeDbUpdateSweepCompletedEvent,
	applyAnimeDbUpdateSweepStoppedEvent,
	createAnimeDbUpdateSweepResult,
} from "./anime-db-update-sweep-result";

describe(
	"anime-db-update-sweep-result",
	() => {
		it(
			"creates the initial sweep result from the persisted cursor",
			() => {
				expect(createAnimeDbUpdateSweepResult({
					initialMaxProviderUpdatedAt: 2_000,
					initialLastTailPage:         20,
				})).toEqual({
					maxProviderUpdatedAt: 2_000,
					lastTailPage:         20,
					stopped:              false,
				});
			},
		);

		it(
			"preserves the newest known tail page when a sweep stops without a page hint",
			() => {
				expect(applyAnimeDbUpdateSweepStoppedEvent(
					{
						maxProviderUpdatedAt: 2_500,
						lastTailPage:         20,
						stopped:              false,
					},
					{
						kind:  "stopped",
						phase: "updatedAt",
					},
				)).toEqual({
					maxProviderUpdatedAt: 2_500,
					lastTailPage:         20,
					stopped:              true,
				});
			},
		);

		it(
			"applies completed tail sweep page hints without marking the run stopped",
			() => {
				expect(applyAnimeDbUpdateSweepCompletedEvent(
					{
						maxProviderUpdatedAt: 2_500,
						lastTailPage:         20,
						stopped:              false,
					},
					{
						kind:         "completed",
						phase:        "tail",
						lastTailPage: 23,
					},
				)).toEqual({
					maxProviderUpdatedAt: 2_500,
					lastTailPage:         23,
					stopped:              false,
				});
			},
		);

		it(
			"advances the high watermark from batch media events",
			() => {
				expect(applyAnimeDbUpdateBatchEvent(
					{
						maxProviderUpdatedAt: 2_500,
						lastTailPage:         20,
						stopped:              false,
					},
					{
						kind:                 "mediaIngested",
						media:                { id: 100 } as AniListMedia,
						providerUpdatedAt:    2_900,
						maxProviderUpdatedAt: 2_900,
					},
				)).toEqual({
					maxProviderUpdatedAt: 2_900,
					lastTailPage:         20,
					stopped:              false,
				});
			},
		);

		it(
			"keeps the latest batch high watermark when batch ingestion stops",
			() => {
				expect(applyAnimeDbUpdateBatchEvent(
					{
						maxProviderUpdatedAt: 2_500,
						lastTailPage:         20,
						stopped:              false,
					},
					{
						kind:                 "stopped",
						maxProviderUpdatedAt: 2_700,
					},
				)).toEqual({
					maxProviderUpdatedAt: 2_700,
					lastTailPage:         20,
					stopped:              true,
				});
			},
		);
	},
);
