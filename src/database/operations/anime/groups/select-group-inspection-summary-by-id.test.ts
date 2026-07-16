// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const { getDatabaseMock } = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"selectGroupInspectionSummaryById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"maps one official group summary without reading member card rows",
			async () => {
				const get     = vi.fn(() => ({
					groupId:                 12,
					groupName:               "Official Summary",
					groupDescription:   null,
					groupImageUrl:           "group.jpg",
					groupIntegrationPercent: 50,
					groupIntegrationStatus:  "tracked",
					mediasCount:             4,
					watchedMediasCount: 3,
				}));
				const prepare = vi.fn((statement: string) => {
					expect(statement).toContain("COUNT(media.mediaId)");
					expect(statement).toContain("AS watchedMediasCount");
					expect(statement).toContain("LEFT JOIN userMediaWatchStates");
					expect(statement).not.toContain("LIMIT");
					return { get };
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectGroupInspectionSummaryById } = await import("./select-group-inspection-summary-by-id");
				expect(selectGroupInspectionSummaryById(12)).toEqual({
					groupId:            12,
					name:               "Official Summary",
					description:        undefined,
					imageUrl:           "group.jpg",
					integrationPercent: 50,
					integrationStatus:  "tracked",
					mediasCount:        4,
					watchedMediasCount: 3,
				});
				expect(get).toHaveBeenCalledWith(12);
			},
		);
	},
);
