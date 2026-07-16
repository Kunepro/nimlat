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
				prepareMock,
				allMock,
			} = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
	prepareMock:     vi.fn(),
	allMock:         vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"selectMediaImagePreviewsByIds",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			allMock.mockReturnValue([]);
			prepareMock.mockReturnValue({ all: allMock });
			getDatabaseMock.mockReturnValue({ prepare: prepareMock });
		});

		it(
			"returns compact image data for hydrated catalog media",
			async () => {
				const { selectMediaImagePreviewsByIds } = await import("./select-media-image-previews-by-ids");

				selectMediaImagePreviewsByIds([
					50,
					60,
				]);

				expect(prepareMock).toHaveBeenCalledOnce();
				expect(prepareMock.mock.calls[ 0 ][ 0 ]).not.toContain("isStub");
				expect(allMock).toHaveBeenCalledWith("[50,60]");
			},
		);
	},
);
