// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const { resolveOrSeedCanonicalMediaIdByAniListIdMock } = vi.hoisted(() => ({
	resolveOrSeedCanonicalMediaIdByAniListIdMock: vi.fn(),
}));

vi.mock(
	"../../canonical/canonical-id-resolution",
	() => ({
		resolveOrSeedCanonicalMediaIdByAniListId: resolveOrSeedCanonicalMediaIdByAniListIdMock,
	}),
);

describe(
	"_upsertMedia",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"loads existing local image overrides by internal media id after provider-id resolution",
			async () => {
				const existingImageGet = vi.fn(() => ({
					customImageUrl: "local-image",
				}));
				const upsertRun        = vi.fn();
				const database         = {
					prepare: vi.fn((sql: string) => {
						if (sql.includes("SELECT customImageUrl")) {
							return {
								get: existingImageGet,
							};
						}
						if (sql.includes("INSERT OR")) {
							return {
								run: upsertRun,
							};
						}

						throw new Error(`Unexpected SQL in _upsertMedia test: ${ sql }`);
					}),
				};
				resolveOrSeedCanonicalMediaIdByAniListIdMock.mockReturnValue(5001);

				const { _upsertMedia } = await import("./_upsert-media");
				_upsertMedia(
					database as never,
					{
						id:                123,
						idMal:             456,
						title:             { english: "Name" },
						type:              "ANIME",
						format:            "TV",
						status:            "FINISHED",
						description:       "desc",
						startDate:         {},
						endDate:           {},
						season:            null,
						seasonYear:        null,
						episodes:          12,
						countryOfOrigin:   "JP",
						source:            null,
						trailer:           null,
						updatedAt:         999,
						coverImage:        null,
						bannerImage:       null,
						averageScore:      80,
						meanScore:         79,
						popularity:        1000,
						isAdult:           false,
						nextAiringEpisode: null,
						airingSchedule:    [],
					} as never,
				);

				expect(resolveOrSeedCanonicalMediaIdByAniListIdMock).toHaveBeenCalledWith(
					database,
					123,
				);
				expect(existingImageGet).toHaveBeenCalledWith(5001);
				expect(upsertRun).toHaveBeenCalledOnce();
			},
		);
	},
);
