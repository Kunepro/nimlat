import type {
	StaffInspectionData,
	StaffMediaCreditCard,
} from "@nimlat/types/ipc-payloads";
import type { InspectionInfoField } from "../../types/components";

export function stripAniListStaffDescription(description?: string | null): string | undefined {
	if (!description) {
		return undefined;
	}

	// AniList staff descriptions can contain small HTML fragments. The shared
	// info panel renders plain text, so strip tags at the feature boundary
	// instead of teaching the generic panel to trust provider markup.
	return description.replace(
		/<[^>]*>/g,
		"",
	).trim() || undefined;
}

function createOptionalStaffField(label: string, value?: string | number | null): InspectionInfoField[] {
	if (value == null || value === "") {
		return [];
	}

	return [
		{
			label,
			value: value.toString(),
		},
	];
}

export function buildStaffInspectionFields(staff: StaffInspectionData): InspectionInfoField[] {
	return [
		{
			label: "Staff ID",
			value: staff.staffId.toString(),
		},
		...createOptionalStaffField(
			"Native name",
			staff.nameNative,
		),
		...(staff.primaryOccupations.length > 0
			? [
				{
					label: "Occupations",
					value: staff.primaryOccupations.join(", "),
				},
			]
			: []),
		...createOptionalStaffField(
			"Language",
			staff.language,
		),
		...createOptionalStaffField(
			"Gender",
			staff.gender,
		),
		...createOptionalStaffField(
			"Born",
			staff.dateOfBirth,
		),
		...createOptionalStaffField(
			"Died",
			staff.dateOfDeath,
		),
		...createOptionalStaffField(
			"Age",
			staff.age,
		),
		...(staff.yearsActive.length > 0
			? [
				{
					label: "Years active",
					value: staff.yearsActive.join(" - "),
				},
			]
			: []),
		...createOptionalStaffField(
			"Home town",
			staff.homeTown,
		),
		...createOptionalStaffField(
			"Blood type",
			staff.bloodType,
		),
		...createOptionalStaffField(
			"Source page",
			staff.siteUrl,
		),
		{
			label: "Media credits",
			value: staff.medias.length.toString(),
		},
	];
}

export function createStaffMediaCreditKey(credit: StaffMediaCreditCard): string {
	return `${ credit.mediaId }:${ credit.role ?? "Unknown" }`;
}
