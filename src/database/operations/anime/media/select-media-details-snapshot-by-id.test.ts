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
	"selectMediaDetailsSnapshotById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			prepareMock.mockReturnValue({ get: getMock });
			getDatabaseMock.mockReturnValue({ prepare: prepareMock });
		});

		it(
			"maps one hydrated media row into a compact rollback/reset snapshot",
			async () => {
				getMock.mockReturnValue({
					bannerImage:    "banner.jpg",
					coverImageJson: "{\"large\":\"cover.jpg\"}",
					customImageUrl: null,
					description:    null,
					mediaId:        42,
					name:           "Provider title",
				});

				const { selectMediaDetailsSnapshotById } = await import("./select-media-details-snapshot-by-id");

				expect(selectMediaDetailsSnapshotById(42)).toEqual({
					mediaId:     42,
					name:        "Provider title",
					description: undefined,
					imageUrl:    "cover.jpg",
				});
				expect(prepareMock.mock.calls[ 0 ]?.[ 0 ]).toContain("media.isStub = 0");
				expect(getMock).toHaveBeenCalledWith(42);
			},
		);

		it(
			"falls back to a stable media label and banner image",
			async () => {
				getMock.mockReturnValue({
					bannerImage:    "banner.jpg",
					coverImageJson: "{broken",
					customImageUrl: null,
					description:    "Description",
					mediaId:        42,
					name:           null,
				});

				const { selectMediaDetailsSnapshotById } = await import("./select-media-details-snapshot-by-id");

				expect(selectMediaDetailsSnapshotById(42)).toEqual({
					mediaId:     42,
					name:        "Media 42",
					description: "Description",
					imageUrl:    "banner.jpg",
				});
			},
		);
	},
);
