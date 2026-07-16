import { getDatabase } from "../../../utils/get-db";

type MissingLineageRepairRow = {
	groupLineageId: number;
	candidateBaseMediaId: number;
};

type GroupLineageBaseRepairRow = {
	groupLineageId: number;
	candidateBaseMediaId: number;
};

type GroupBaseRepairRow = {
	groupId: number;
	candidateBaseMediaId: number;
};

/**
 * Repair safe, deterministic base-media identity drift for concrete official anime groups.
 *
 * Rules:
 * - if a concrete `anime_data.groups` row has no lineage row but does have one valid base media,
 *   recreate the lineage row from that group identity
 * - if the lineage base media is missing/invalid but the concrete group base media is valid,
 *   restore the lineage base media from the group row
 * - if the concrete group base media is missing/invalid or drifted from the lineage identity,
 *   reset it back to the lineage base media
 *
 * Ambiguous collisions are intentionally left untouched so the later safety assert can still block.
 */
export function repairAttachedAnimeDbGroupIdentities(): void {
	const db = getDatabase();

	db.transaction(() => {
		const missingLineageRows = db.prepare<[], MissingLineageRepairRow>(`
            SELECT groups.groupLineageId,
                   groups.baseMediaId AS candidateBaseMediaId
            FROM anime_data.groups groups
                     LEFT JOIN anime_data.groupLineages lineages
                               ON lineages.groupLineageId = groups.groupLineageId
                     JOIN anime_data.media groupBaseMedia
                          ON groupBaseMedia.mediaId = groups.baseMediaId
                     LEFT JOIN anime_data.groupLineages conflictingLineage
                               ON conflictingLineage.baseMediaId = groups.baseMediaId
            WHERE lineages.groupLineageId IS NULL
              AND groupBaseMedia.idAniList IS NOT NULL
              AND conflictingLineage.groupLineageId IS NULL
            ORDER BY groups.id
		`).all();
		const insertLineage     = db.prepare<[ number, number ]>(`
            INSERT INTO anime_data.groupLineages (groupLineageId, baseMediaId)
            VALUES (?, ?)
		`);

		missingLineageRows.forEach((row) => {
			insertLineage.run(
				row.groupLineageId,
				row.candidateBaseMediaId,
			);
		});

		const lineageBaseRepairRows = db.prepare<[], GroupLineageBaseRepairRow>(`
            SELECT groups.groupLineageId,
                   groups.baseMediaId AS candidateBaseMediaId
            FROM anime_data.groups groups
                     JOIN anime_data.groupLineages lineages
                          ON lineages.groupLineageId = groups.groupLineageId
                     JOIN anime_data.media groupBaseMedia
                          ON groupBaseMedia.mediaId = groups.baseMediaId
                     LEFT JOIN anime_data.media lineageBaseMedia
                               ON lineageBaseMedia.mediaId = lineages.baseMediaId
                     LEFT JOIN anime_data.groupLineages conflictingLineage
                               ON conflictingLineage.baseMediaId = groups.baseMediaId
                                   AND conflictingLineage.groupLineageId <> groups.groupLineageId
            WHERE groupBaseMedia.idAniList IS NOT NULL
              AND (lineages.baseMediaId IS NULL
                OR lineageBaseMedia.mediaId IS NULL
                OR lineageBaseMedia.idAniList IS NULL)
              AND conflictingLineage.groupLineageId IS NULL
            ORDER BY groups.id
		`).all();
		const updateLineageBase = db.prepare<[ number, number ]>(`
            UPDATE anime_data.groupLineages
            SET baseMediaId = ?
            WHERE groupLineageId = ?
		`);

		lineageBaseRepairRows.forEach((row) => {
			updateLineageBase.run(
				row.candidateBaseMediaId,
				row.groupLineageId,
			);
		});

		const groupBaseRepairRows = db.prepare<[], GroupBaseRepairRow>(`
            SELECT groups.id          AS groupId,
                   lineages.baseMediaId AS candidateBaseMediaId
            FROM anime_data.groups groups
                     JOIN anime_data.groupLineages lineages
                          ON lineages.groupLineageId = groups.groupLineageId
                     JOIN anime_data.media lineageBaseMedia
                          ON lineageBaseMedia.mediaId = lineages.baseMediaId
                     LEFT JOIN anime_data.media groupBaseMedia
                               ON groupBaseMedia.mediaId = groups.baseMediaId
                     LEFT JOIN anime_data.groups conflictingGroup
                               ON conflictingGroup.baseMediaId = lineages.baseMediaId
                                   AND conflictingGroup.id <> groups.id
            WHERE lineageBaseMedia.idAniList IS NOT NULL
              AND (groupBaseMedia.mediaId IS NULL
                OR groupBaseMedia.idAniList IS NULL
                OR groups.baseMediaId <> lineages.baseMediaId)
              AND conflictingGroup.id IS NULL
            ORDER BY groups.id
		`).all();
		const updateGroupBase   = db.prepare<[ number, number ]>(`
            UPDATE anime_data.groups
            SET baseMediaId = ?
            WHERE id = ?
		`);

		groupBaseRepairRows.forEach((row) => {
			updateGroupBase.run(
				row.candidateBaseMediaId,
				row.groupId,
			);
		});
	})();
}
