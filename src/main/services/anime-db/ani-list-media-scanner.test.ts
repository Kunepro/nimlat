// @vitest-environment node
import type { AniListMediaProviderClient } from "@nimlat/types/provider-clients";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { AniListMediasScanBatch } from "./ani-list-media-scanner";
import { scanAllMedias } from "./ani-list-media-scanner";

const providerState = vi.hoisted(() => ({
	current: null as AniListMediaProviderClient | null,
}));

vi.mock(
	"../../providers/media-provider-registry",
	() => ({
		MediaProviderRegistry: {
			getAniListMediaProvider: () => {
				if (!providerState.current) {
					throw new Error("Missing AniList media provider test double.");
				}

				return providerState.current;
			},
		},
	}),
);

describe(
	"scanAllMedias",
	() => {
		it(
			"uses series-hydration priority ID windows from the last completed AniList id",
			async () => {
				const provider: AniListMediaProviderClient = {
					getMediaById:            vi.fn(),
					queryLatestAnimeMediaId: vi.fn().mockResolvedValue(102),
					queryAnimeMediasPage:    vi.fn().mockResolvedValue({
						Page: {
							pageInfo: {
								total:       1,
								perPage:     2,
								currentPage: 1,
								lastPage:    1,
								hasNextPage: false,
							},
							media:    [
								{ id: 101 },
							],
						},
					}),
				} as AniListMediaProviderClient;
				providerState.current                      = provider;

				const batches: AniListMediasScanBatch[] = [];
				for await (const batch of scanAllMedias(
					100,
					true,
					2,
				)) {
					batches.push(batch);
				}

				expect(provider.queryLatestAnimeMediaId).toHaveBeenCalledWith(
					"series-hydration",
					expect.objectContaining({ source: "anime-db-populator" }),
				);
				expect(provider.queryAnimeMediasPage).toHaveBeenCalledWith(expect.objectContaining({
					page:     1,
					perPage:  2,
					idIn:     [
						101,
						102,
					],
					priority: "series-hydration",
				}));
				expect(batches).toEqual([
					expect.objectContaining({
						requestCount: 1,
						batchMaxId:   102,
					}),
				]);
			},
		);
	},
);
