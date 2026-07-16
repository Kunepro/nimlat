import type {
	StaffInspectionData,
	StaffMediaCreditCard,
} from "@nimlat/types/ipc-payloads";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";
import { resolveStaffImageUrl } from "./staff-image";

export type StaffInspectionStaffRow = {
	age: number | null;
	bloodType: string | null;
	dateOfBirthJson: string | null;
	dateOfDeathJson: string | null;
	description: string | null;
	gender: string | null;
	homeTown: string | null;
	imageJson: string | null;
	language: string | null;
	nameFull: string | null;
	nameNative: string | null;
	primaryOccupationsJson: string | null;
	siteUrl: string | null;
	staffId: number;
	yearsActiveJson: string | null;
};

export type StaffInspectionMediaRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	format: string | null;
	mediaId: number;
	mediaName: string | null;
	mediaNameJapanese: string | null;
	mediaNameRomanji: string | null;
	role: string | null;
};

export type StaffInspectionModelRows = {
	mediaRows: StaffInspectionMediaRow[];
	staff: StaffInspectionStaffRow;
};

type FuzzyDateRow = {
	day?: number | null;
	month?: number | null;
	year?: number | null;
};

export function parseStringArray(json: string | null): string[] {
	if (!json) {
		return [];
	}
	try {
		const value = JSON.parse(json) as unknown;
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

export function parseNumberArray(json: string | null): number[] {
	if (!json) {
		return [];
	}
	try {
		const value = JSON.parse(json) as unknown;
		return Array.isArray(value)
			? value.filter((item): item is number => typeof item === "number")
			: [];
	} catch {
		return [];
	}
}

export function formatStaffFuzzyDate(json: string | null): string | undefined {
	if (!json) {
		return undefined;
	}
	try {
		const value = JSON.parse(json) as FuzzyDateRow | null;
		if (!value?.year) {
			return undefined;
		}
		const month = value.month?.toString().padStart(
			2,
			"0",
		);
		const day   = value.day?.toString().padStart(
			2,
			"0",
		);
		return [
			value.year.toString(),
			month,
			day,
		].filter(Boolean).join("-");
	} catch {
		return undefined;
	}
}

function mapStaffMedia(row: StaffInspectionMediaRow): StaffMediaCreditCard {
	return {
		format:        row.format || undefined,
		mediaId:       row.mediaId,
		mediaImageUrl: resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		mediaName:     row.mediaName || row.mediaNameRomanji || row.mediaNameJapanese || `Media ${ row.mediaId }`,
		role:          row.role ?? undefined,
	};
}

export function createStaffInspectionData({
																						mediaRows,
																						staff,
																					}: StaffInspectionModelRows): StaffInspectionData {
	return {
		age:                staff.age ?? undefined,
		bloodType:          staff.bloodType ?? undefined,
		dateOfBirth:        formatStaffFuzzyDate(staff.dateOfBirthJson),
		dateOfDeath:        formatStaffFuzzyDate(staff.dateOfDeathJson),
		description:        staff.description ?? undefined,
		gender:             staff.gender ?? undefined,
		homeTown:           staff.homeTown ?? undefined,
		imageUrl:           resolveStaffImageUrl(staff.imageJson),
		language:           staff.language ?? undefined,
		medias:             mediaRows.map(mapStaffMedia),
		name:               staff.nameFull || staff.nameNative || `Staff ${ staff.staffId }`,
		nameNative:         staff.nameNative || undefined,
		primaryOccupations: parseStringArray(staff.primaryOccupationsJson),
		siteUrl:            staff.siteUrl ?? undefined,
		staffId:            staff.staffId,
		yearsActive:        parseNumberArray(staff.yearsActiveJson),
	};
}
