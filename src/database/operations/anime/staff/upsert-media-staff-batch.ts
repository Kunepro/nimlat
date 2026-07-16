import { StaffEdge } from "@nimlat/types/ani-list-media-api";
import { getDatabase } from "../../../utils/get-db";

function resolveStaffName(edge: StaffEdge): string {
	return edge.node.name.full || edge.node.name.native || `Staff ${ edge.node.id }`;
}

function resolveStaffRole(edge: StaffEdge): string {
	return edge.role?.trim() || "Unknown";
}

// Staff identity is global, while role/sort order are media-specific edge facts.
// Rewriting the mediaStaff rows per media prevents stale credits after refreshes.
export function upsertMediaStaffBatch(mediaId: number, staffEdges: StaffEdge[]): void {
	const db = getDatabase();

	// noinspection SqlResolve
	const deleteMediaStaffStmt = db.prepare(`
      DELETE FROM anime_data.mediaStaff
      WHERE mediaId = ?
	`);

	// noinspection SqlResolve
	const insertStaffStmt = db.prepare(`
      INSERT INTO anime_data.staff
          (staffId, nameFull, nameNative, alternativeNamesJson, language, imageJson, description, primaryOccupationsJson, gender, dateOfBirthJson, dateOfDeathJson, age, yearsActiveJson, homeTown, bloodType, siteUrl)
      VALUES (@staffId, @nameFull, @nameNative, @alternativeNamesJson, @language, @imageJson, @description, @primaryOccupationsJson, @gender, @dateOfBirthJson, @dateOfDeathJson, @age, @yearsActiveJson, @homeTown, @bloodType, @siteUrl)
      ON CONFLICT(staffId) DO UPDATE SET
          nameFull = excluded.nameFull,
          nameNative = excluded.nameNative,
          alternativeNamesJson = excluded.alternativeNamesJson,
          language = excluded.language,
          imageJson = excluded.imageJson,
          description = excluded.description,
          primaryOccupationsJson = excluded.primaryOccupationsJson,
          gender = excluded.gender,
          dateOfBirthJson = excluded.dateOfBirthJson,
          dateOfDeathJson = excluded.dateOfDeathJson,
          age = excluded.age,
          yearsActiveJson = excluded.yearsActiveJson,
          homeTown = excluded.homeTown,
          bloodType = excluded.bloodType,
          siteUrl = excluded.siteUrl
	`);

	// noinspection SqlResolve
	const insertMediaStaffStmt = db.prepare(`
      INSERT INTO anime_data.mediaStaff
          (mediaId, staffId, role, sortOrder)
      VALUES (@mediaId, @staffId, @role, @sortOrder)
      ON CONFLICT(mediaId, staffId, role) DO UPDATE SET
          sortOrder = excluded.sortOrder
	`);

	const upsert = db.transaction((edges: StaffEdge[]) => {
		deleteMediaStaffStmt.run(mediaId);

		edges.forEach((edge, index) => {
			insertStaffStmt.run({
				staffId:                edge.node.id,
				nameFull:               resolveStaffName(edge),
				nameNative:             edge.node.name.native ?? null,
				alternativeNamesJson:   JSON.stringify(edge.node.name.alternative ?? []),
				language:               edge.node.language ?? null,
				imageJson:              JSON.stringify(edge.node.image ?? null),
				description:            edge.node.description ?? null,
				primaryOccupationsJson: JSON.stringify(edge.node.primaryOccupations ?? []),
				gender:                 edge.node.gender ?? null,
				dateOfBirthJson:        JSON.stringify(edge.node.dateOfBirth ?? null),
				dateOfDeathJson:        JSON.stringify(edge.node.dateOfDeath ?? null),
				age:                    edge.node.age ?? null,
				yearsActiveJson:        JSON.stringify(edge.node.yearsActive ?? []),
				homeTown:               edge.node.homeTown ?? null,
				bloodType:              edge.node.bloodType ?? null,
				siteUrl:                edge.node.siteUrl ?? null,
			});
			insertMediaStaffStmt.run({
				mediaId,
				staffId:   edge.node.id,
				role:      resolveStaffRole(edge),
				sortOrder: index,
			});
		});
	});

	upsert(staffEdges);
}
