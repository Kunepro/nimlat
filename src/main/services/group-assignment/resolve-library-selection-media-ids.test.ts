// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getMediaIdsByRef = vi.fn();

vi.mock(
	"../group/group-read-repository",
	() => ({
		GroupReadRepository: {
			getMediaIdsByRef,
		},
	}),
);

describe(
	"resolveLibrarySelectionMediaIds",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"expands selected groups and deduplicates media ids",
			async () => {
				getMediaIdsByRef
					.mockReturnValueOnce([
						11,
						12,
					])
					.mockReturnValueOnce([
						12,
						13,
					]);

				const { resolveLibrarySelectionMediaIds } = await import("./resolve-library-selection-media-ids");
				const result = resolveLibrarySelectionMediaIds([
					{
						kind: "media",
						mediaId: 10,
					},
					{
						kind:  "group",
						group: {
							source: "official",
							groupId: 1,
						},
					},
					{
						kind:  "group",
						group: {
							source: "user",
							groupId: 2,
						},
					},
				]);

				expect(result).toEqual([
					10,
					11,
					12,
					13,
				]);
			},
		);
	},
);
