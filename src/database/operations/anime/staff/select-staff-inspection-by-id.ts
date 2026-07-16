import type { StaffInspectionData } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";
import {
	createStaffInspectionData,
	type StaffInspectionMediaRow,
	type StaffInspectionStaffRow,
} from "./staff-inspection-model";

const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

const STMT_STAFF = sql`
    SELECT staffId,
           nameFull,
           nameNative,
           imageJson,
           language,
           description,
           primaryOccupationsJson,
           gender,
           dateOfBirthJson,
           dateOfDeathJson,
           age,
           yearsActiveJson,
           homeTown,
           bloodType,
           siteUrl
    FROM anime_data.staff
    WHERE staffId = ?
`;

const STMT_STAFF_MEDIAS = sql`
    SELECT media.mediaId,
           COALESCE(userMediaOverrides.name, ${ PREFERRED_MEDIA_TITLE_SQL }) AS mediaName,
           media.nameRomanji AS mediaNameRomanji,
           media.nameJapanese AS mediaNameJapanese,
           media.format,
           media.coverImageJson,
           media.bannerImage,
           media.customImageUrl,
           mediaStaff.role
    FROM anime_data.mediaStaff mediaStaff
             INNER JOIN anime_data.media media
                        ON media.mediaId = mediaStaff.mediaId
             LEFT JOIN userMediaOverrides
                       ON userMediaOverrides.mediaId = media.mediaId
    WHERE mediaStaff.staffId = ?
      AND media.isStub = 0
    ORDER BY media.name COLLATE NOCASE ASC,
             mediaStaff.role COLLATE NOCASE ASC,
             media.mediaId ASC
`;

export function selectStaffInspectionById(staffId: number): StaffInspectionData | null {
	const staff = getDatabase()
		.prepare(STMT_STAFF)
		.get(staffId) as StaffInspectionStaffRow | undefined;

	if (!staff) {
		return null;
	}

	const mediaRows = getDatabase()
		.prepare(STMT_STAFF_MEDIAS)
		.all(staffId) as StaffInspectionMediaRow[];

	return createStaffInspectionData({
		mediaRows,
		staff,
	});
}
