// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createGroupInspectionSummary,
	type GroupInspectionSummaryRow,
} from "./group-inspection-summary-model";

function createRow(overrides: Partial<GroupInspectionSummaryRow> = {}): GroupInspectionSummaryRow {
	return {
		groupDescription:        null,
		groupId:                 12,
		groupImageUrl:           "group.jpg",
		groupIntegrationPercent: 50,
		groupIntegrationStatus:  "tracked",
		groupName:               "Official Summary",
		mediasCount:             4,
		watchedMediasCount:      2,
		...overrides,
	};
}

describe(
	"group inspection summary model",
	() => {
		it(
			"returns null for missing rows",
			() => {
				expect(createGroupInspectionSummary(undefined)).toBeNull();
			},
		);

		it(
			"maps aggregate group summary rows",
			() => {
				expect(createGroupInspectionSummary(createRow())).toEqual({
					description:        undefined,
					groupId:            12,
					imageUrl:           "group.jpg",
					integrationPercent: 50,
					integrationStatus:  "tracked",
					mediasCount:        4,
					name:               "Official Summary",
					watchedMediasCount: 2,
				});
			},
		);

		it(
			"normalizes nullable metadata while preserving zero aggregates",
			() => {
				expect(createGroupInspectionSummary(createRow({
					groupDescription:        "Empty",
					groupImageUrl:           null,
					groupIntegrationPercent: null,
					groupIntegrationStatus:  null,
					mediasCount:             0,
					watchedMediasCount:      0,
				}))).toEqual({
					description:        "Empty",
					groupId:            12,
					imageUrl:           undefined,
					integrationPercent: undefined,
					integrationStatus:  undefined,
					mediasCount:        0,
					name:               "Official Summary",
					watchedMediasCount: 0,
				});
			},
		);
	},
);
