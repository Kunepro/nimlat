// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const {
				getDatabaseMock,
				getMock,
				prepareMock,
			} = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
	getMock:         vi.fn(),
	prepareMock:     vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"selectEpisodeDetailsSnapshotById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			prepareMock.mockReturnValue({ get: getMock });
			getDatabaseMock.mockReturnValue({ prepare: prepareMock });
		});

		it(
			"maps one episode row into the compact reset/gallery snapshot",
			async () => {
				getMock.mockReturnValue({
					aired:         "2026-07-05T10:00:00Z",
					duration:      24,
					episodeNumber: 4,
					filler:        1,
					mediaId:       42,
					name:          "Episode title",
					score:         8.1,
					synopsis:      "Provider synopsis",
					thumbnail:     " https://img.example.test/episode.jpg ",
				});

				const { selectEpisodeDetailsSnapshotById } = await import("./select-episode-details-snapshot-by-id");

				expect(selectEpisodeDetailsSnapshotById(
					42,
					4,
				)).toEqual({
					mediaId:       42,
					episodeNumber: 4,
					name:          "Episode title",
					description:   undefined,
					aired:         "2026-07-05T10:00:00Z",
					duration:      24,
					score:         8.1,
					filler:        true,
					recap:         "Provider synopsis",
					thumbnail:     "https://img.example.test/episode.jpg",
				});
				expect(getMock).toHaveBeenCalledWith(
					42,
					4,
				);
			},
		);

		it(
			"returns null when the episode is not present",
			async () => {
				getMock.mockReturnValue(undefined);

				const { selectEpisodeDetailsSnapshotById } = await import("./select-episode-details-snapshot-by-id");

				expect(selectEpisodeDetailsSnapshotById(
					42,
					4,
				)).toBeNull();
			},
		);
	},
);
