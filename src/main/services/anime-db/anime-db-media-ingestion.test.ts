// @vitest-environment node
import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const upsertMedia              = vi.fn();
const catalogMediaIngestedNext = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media: {
				upsertMedia,
			},
		},
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_CatalogMediaIngested: {
			next: catalogMediaIngestedNext,
		},
	}),
);

const media = {
	id:    123,
	idMal: 456,
	title: {
		english: "Test Media",
	},
} as AniListMedia;

describe(
	"ingestAnimeDbMedia",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			upsertMedia.mockReturnValue(987);
		});

		it(
			"publishes one catalog-ingested event after the AniList upsert stores relation rows",
			async () => {
				const { ingestAnimeDbMedia } = await import("./anime-db-media-ingestion");

				const result = ingestAnimeDbMedia(
					media,
					{ source: "anime-db-updater" },
				);

				expect(result).toBe(987);
				expect(upsertMedia).toHaveBeenCalledWith(media);
				expect(catalogMediaIngestedNext).toHaveBeenCalledWith({
					mediaId:   987,
					idAniList: 123,
					idMal:     456,
					source:    "anime-db-updater",
				});
			},
		);

		it(
			"does not publish an ingestion event when the upsert rejects the media",
			async () => {
				upsertMedia.mockReturnValue(undefined);
				const { ingestAnimeDbMedia } = await import("./anime-db-media-ingestion");

				const result = ingestAnimeDbMedia(
					media,
					{ source: "release-watch-daemon" },
				);

				expect(result).toBeUndefined();
				expect(catalogMediaIngestedNext).not.toHaveBeenCalled();
			},
		);
	},
);
