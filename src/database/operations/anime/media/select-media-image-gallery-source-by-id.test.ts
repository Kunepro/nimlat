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
	"selectMediaImageGallerySourceById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			prepareMock.mockReturnValue({ get: getMock });
			getDatabaseMock.mockReturnValue({ prepare: prepareMock });
		});

		it(
			"returns only provider image fields needed by the media gallery",
			async () => {
				getMock.mockReturnValue({
					bannerImage:    "banner.jpg",
					coverImageJson: "{\"extraLarge\":\"portrait-xl.jpg\",\"large\":\"portrait.jpg\"}",
					customImageUrl: null,
					mediaId:        42,
				});

				const { selectMediaImageGallerySourceById } = await import("./select-media-image-gallery-source-by-id");

				expect(selectMediaImageGallerySourceById(42)).toEqual({
					mediaId:     42,
					imageUrl:    "portrait-xl.jpg",
					bannerImage: "banner.jpg",
				});
				expect(prepareMock.mock.calls[ 0 ]?.[ 0 ]).toContain("media.isStub = 0");
				expect(getMock).toHaveBeenCalledWith(42);
			},
		);
	},
);
