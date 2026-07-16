// @vitest-environment node
import {
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const paths = vi.hoisted(() => {
	const root = `${ process.env.TMPDIR ?? "/tmp" }/nimlat-group-image-storage-test-${ process.pid }`;
	return {
		root,
		data:          `${ root }/data`,
		groupImages:   `${ root }/data/user-images/groups`,
		mediaImages:   `${ root }/data/user-images/medias`,
		episodeImages: `${ root }/data/user-images/episodes`,
	};
});

const cropMock        = vi.hoisted(() => vi.fn());
const resizeMock      = vi.hoisted(() => vi.fn());
const toJpegMock      = vi.hoisted(() => vi.fn(() => Buffer.from("optimized-upload")));
const nativeImageMock = vi.hoisted(() => ({
	createFromBuffer: vi.fn(() => ({
		isEmpty: () => false,
		getSize: () => ({
			width:  1000,
			height: 1000,
		}),
		crop:    cropMock,
	})),
}));

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_DATA:                paths.data,
		PATH_GROUP_USER_IMAGES:   paths.groupImages,
		PATH_MEDIA_USER_IMAGES:   paths.mediaImages,
		PATH_EPISODE_USER_IMAGES: paths.episodeImages,
	}),
);

vi.mock(
	"electron",
	() => ({
		nativeImage: nativeImageMock,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: vi.fn(),
		},
	}),
);

describe(
	"group image storage gallery uploads",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			rmSync(
				paths.root,
				{
					force:     true,
					recursive: true,
				},
			);
			mkdirSync(
				paths.root,
				{ recursive: true },
			);
			resizeMock.mockReturnValue({ toJPEG: toJpegMock });
			cropMock.mockReturnValue({ resize: resizeMock });
		});

		afterEach(() => {
			rmSync(
				paths.root,
				{
					force:     true,
					recursive: true,
				},
			);
		});

		it(
			"center-crops and resizes media gallery uploads to poster bounds",
			async () => {
				const sourcePath = `${ paths.root }/source.png`;
				writeFileSync(
					sourcePath,
					"source-image",
				);

				const { storeMediaImage } = await import("./group-image-storage-service");
				const storedPath          = storeMediaImage(
					sourcePath,
					"primary",
				);

				expect(storedPath.replaceAll(
					"\\",
					"/",
				)).toContain("/user-images/medias/");
				expect(storedPath.endsWith(".jpg")).toBe(true);
				expect(cropMock).toHaveBeenCalledWith({
					x:      152,
					y:      0,
					width:  696,
					height: 1000,
				});
				expect(resizeMock).toHaveBeenCalledWith({
					width:   408,
					height:  586,
					quality: "best",
				});
				expect(toJpegMock).toHaveBeenCalledWith(82);
			},
		);
	},
);
