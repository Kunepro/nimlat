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
	"selectUserGroupInspectionSummaryById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"maps one user group summary with media count",
			async () => {
				const get     = vi.fn(() => ({
					groupId:                 9,
					groupName:               "User Summary",
					groupDescription:   "Custom",
					groupImageUrl:           null,
					groupIntegrationPercent: null,
					groupIntegrationStatus:  null,
					mediasCount:             2,
					watchedMediasCount: 1,
				}));
				const prepare = vi.fn((statement: string) => {
					expect(statement).toContain("FROM userGroups");
					expect(statement).toContain("COUNT(media.mediaId)");
					expect(statement).toContain("AS watchedMediasCount");
					expect(statement).toContain("LEFT JOIN userMediaWatchStates");
					return { get };
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectUserGroupInspectionSummaryById } = await import("./select-user-group-inspection-summary-by-id");
				expect(selectUserGroupInspectionSummaryById(9)).toEqual({
					groupId:            9,
					name:               "User Summary",
					description:        "Custom",
					imageUrl:           undefined,
					integrationPercent: undefined,
					integrationStatus:  undefined,
					mediasCount:        2,
					watchedMediasCount: 1,
				});
				expect(get).toHaveBeenCalledWith(9);
			},
		);
	},
);
