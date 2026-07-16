import type { StaffInspectionData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildStaffInspectionFields,
	createStaffMediaCreditKey,
	stripAniListStaffDescription,
} from "./staff-details-explorer-model";

function createStaff(overrides: Partial<StaffInspectionData> = {}): StaffInspectionData {
	return {
		staffId:            12,
		name:               "Yoko Kanno",
		primaryOccupations: [],
		yearsActive:        [],
		medias:             [],
		...overrides,
	};
}

describe(
	"staff-details-explorer-model",
	() => {
		it(
			"strips AniList markup at the feature boundary",
			() => {
				expect(stripAniListStaffDescription(" <p>Composer<br/>Arranger</p> ")).toBe("ComposerArranger");
				expect(stripAniListStaffDescription("   ")).toBeUndefined();
				expect(stripAniListStaffDescription(null)).toBeUndefined();
			},
		);

		it(
			"builds inspection fields with only present optional staff details",
			() => {
				expect(buildStaffInspectionFields(createStaff({
					nameNative:         "菅野よう子",
					language:           "Japanese",
					gender:             "Female",
					dateOfBirth:        "1963-03-18",
					age:                63,
					yearsActive:        [
						1985,
						2026,
					],
					homeTown:           "Miyagi",
					bloodType:          "O",
					siteUrl:            "https://example.test/staff/12",
					primaryOccupations: [
						"Composer",
						"Arranger",
					],
					medias:             [
						{
							mediaId:   1,
							mediaName: "Cowboy Bebop",
						},
					],
				}))).toEqual([
					{
						label: "Staff ID",
						value: "12",
					},
					{
						label: "Native name",
						value: "菅野よう子",
					},
					{
						label: "Occupations",
						value: "Composer, Arranger",
					},
					{
						label: "Language",
						value: "Japanese",
					},
					{
						label: "Gender",
						value: "Female",
					},
					{
						label: "Born",
						value: "1963-03-18",
					},
					{
						label: "Age",
						value: "63",
					},
					{
						label: "Years active",
						value: "1985 - 2026",
					},
					{
						label: "Home town",
						value: "Miyagi",
					},
					{
						label: "Blood type",
						value: "O",
					},
					{
						label: "Source page",
						value: "https://example.test/staff/12",
					},
					{
						label: "Media credits",
						value: "1",
					},
				]);
			},
		);

		it(
			"creates stable staff media credit keys",
			() => {
				expect(createStaffMediaCreditKey({
					mediaId:   1,
					mediaName: "Cowboy Bebop",
					role:      "Music",
				})).toBe("1:Music");
				expect(createStaffMediaCreditKey({
					mediaId:   1,
					mediaName: "Cowboy Bebop",
				})).toBe("1:Unknown");
			},
		);
	},
);
