import { getDatabase } from "../../../utils/get-db";

type MediaIdRow = { mediaId: number };

// Release Watch scope rebuilds need the full current followed set, not only the
// IDs changed in the latest cascade.
export function selectAllTrackedMediaIds(): number[] {
	return getDatabase()
		.prepare(`
      SELECT mediaId
      FROM userMediaIntegrationSnapshots
      WHERE integrationPercent IS NOT NULL
		`)
		.all()
		.map((row) => (row as MediaIdRow).mediaId);
}
