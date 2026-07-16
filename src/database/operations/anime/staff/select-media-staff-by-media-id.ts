import { MediaStaffListItem } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { resolveStaffImageUrl } from "./staff-image";

type MediaStaffRow = {
	staffId: number;
	nameFull: string | null;
	nameNative: string | null;
	imageJson: string | null;
	language: string | null;
	primaryOccupationsJson: string | null;
	siteUrl: string | null;
	role: string | null;
};

const STMT_MEDIA_STAFF = sql`
    SELECT staff.staffId,
           staff.nameFull,
           staff.nameNative,
           staff.imageJson,
           staff.language,
           staff.primaryOccupationsJson,
           staff.siteUrl,
           mediaStaff.role
    FROM anime_data.mediaStaff mediaStaff
             INNER JOIN anime_data.staff staff
                        ON staff.staffId = mediaStaff.staffId
    WHERE mediaStaff.mediaId = ?
    ORDER BY mediaStaff.sortOrder ASC,
             staff.nameFull COLLATE NOCASE ASC,
             staff.staffId ASC
`;

function parseStringArray(json: string | null): string[] {
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

export function selectMediaStaffByMediaId(mediaId: number): MediaStaffListItem[] {
	const rows = getDatabase()
		.prepare(STMT_MEDIA_STAFF)
		.all(mediaId) as MediaStaffRow[];

	return rows.map((row): MediaStaffListItem => ({
		staffId:            row.staffId,
		name:               row.nameFull || row.nameNative || `Staff ${ row.staffId }`,
		nameNative:         row.nameNative || undefined,
		imageUrl:           resolveStaffImageUrl(row.imageJson),
		language:           row.language ?? undefined,
		role:               row.role ?? undefined,
		primaryOccupations: parseStringArray(row.primaryOccupationsJson),
		siteUrl:            row.siteUrl ?? undefined,
	}));
}
