// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createStaffInspectionData,
	formatStaffFuzzyDate,
	parseNumberArray,
	parseStringArray,
	type StaffInspectionMediaRow,
	type StaffInspectionStaffRow,
} from "./staff-inspection-model";

function createStaff(overrides: Partial<StaffInspectionStaffRow> = {}): StaffInspectionStaffRow {
	return {
		age:                    42,
		bloodType:              "O",
		dateOfBirthJson:        "{\"year\":1980,\"month\":3,\"day\":4}",
		dateOfDeathJson:        null,
		description:            "Director and writer.",
		gender:                 "Female",
		homeTown:               "Tokyo",
		imageJson:              "{\"large\":\"staff.jpg\"}",
		language:               "Japanese",
		nameFull:               "Example Staff",
		nameNative:             "Native Staff",
		primaryOccupationsJson: "[\"Director\",10,\"Writer\"]",
		siteUrl:                "https://example.test/staff",
		staffId:                12,
		yearsActiveJson:        "[1999,\"bad\",2001]",
		...overrides,
	};
}

function createMedia(overrides: Partial<StaffInspectionMediaRow> = {}): StaffInspectionMediaRow {
	return {
		bannerImage:       null,
		coverImageJson:    "{\"large\":\"media.jpg\"}",
		customImageUrl:    null,
		format:            "TV",
		mediaId:           42,
		mediaName:         "Cowboy Bebop",
		mediaNameJapanese: null,
		mediaNameRomanji:  null,
		role:              "Director",
		...overrides,
	};
}

describe(
	"staff inspection model",
	() => {
		it(
			"parses JSON arrays and fuzzy dates defensively",
			() => {
				expect(parseStringArray("[\"Director\", 1, \"Writer\"]")).toEqual([
					"Director",
					"Writer",
				]);
				expect(parseStringArray("{broken")).toEqual([]);
				expect(parseNumberArray("[1999,\"bad\",2001]")).toEqual([
					1999,
					2001,
				]);
				expect(parseNumberArray(null)).toEqual([]);
				expect(formatStaffFuzzyDate("{\"year\":1980,\"month\":3,\"day\":4}")).toBe("1980-03-04");
				expect(formatStaffFuzzyDate("{\"year\":1980,\"month\":3}")).toBe("1980-03");
				expect(formatStaffFuzzyDate("{\"month\":3}")).toBeUndefined();
			},
		);

		it(
			"maps staff and media rows into the renderer-facing inspection payload",
			() => {
				expect(createStaffInspectionData({
					mediaRows: [
						createMedia(),
						createMedia({
							bannerImage:       "banner.jpg",
							coverImageJson:    "{broken",
							mediaId:           43,
							mediaName:         null,
							mediaNameJapanese: "Native Media",
							role:              null,
						}),
					],
					staff:     createStaff(),
				})).toEqual({
					age:                42,
					bloodType:          "O",
					dateOfBirth:        "1980-03-04",
					dateOfDeath:        undefined,
					description:        "Director and writer.",
					gender:             "Female",
					homeTown:           "Tokyo",
					imageUrl:           "staff.jpg",
					language:           "Japanese",
					medias:             [
						{
							format:        "TV",
							mediaId:       42,
							mediaImageUrl: "media.jpg",
							mediaName:     "Cowboy Bebop",
							role:          "Director",
						},
						{
							format:        "TV",
							mediaId:       43,
							mediaImageUrl: "banner.jpg",
							mediaName:     "Native Media",
							role:          undefined,
						},
					],
					name:               "Example Staff",
					nameNative:         "Native Staff",
					primaryOccupations: [
						"Director",
						"Writer",
					],
					siteUrl:            "https://example.test/staff",
					staffId:            12,
					yearsActive:        [
						1999,
						2001,
					],
				});
			},
		);

		it(
			"falls back missing staff and media names to stable ids",
			() => {
				const inspection = createStaffInspectionData({
					mediaRows: [
						createMedia({
							coverImageJson:    null,
							mediaId:           44,
							mediaName:         null,
							mediaNameJapanese: null,
							mediaNameRomanji:  null,
						}),
					],
					staff:     createStaff({
						age:                    null,
						imageJson:              null,
						nameFull:               null,
						nameNative:             null,
						primaryOccupationsJson: null,
						staffId:                77,
						yearsActiveJson:        null,
					}),
				});

				expect(inspection.name).toBe("Staff 77");
				expect(inspection.imageUrl).toBeUndefined();
				expect(inspection.medias[ 0 ]?.mediaName).toBe("Media 44");
				expect(inspection.primaryOccupations).toEqual([]);
				expect(inspection.yearsActive).toEqual([]);
			},
		);
	},
);
