import { getDatabase } from "../../../utils/get-db";

type MediaIdRow = { mediaId: number };

// Resolve media explicitly marked as ignored so derived interest scopes honor
// the user's strongest negative signal.
export function selectIgnoredMediaIds(mediaIds: number[]): number[] {
	if (mediaIds.length === 0) {
		return [];
	}

	const uniqueMediaIds = Array.from(new Set(mediaIds));
	const placeholders   = uniqueMediaIds.map(() => "?").join(", ");

	return getDatabase()
		.prepare(`
      SELECT mediaId
      FROM userMediaStates
      WHERE integrationStatus IN ('ignored', 'not_interested')
        AND mediaId IN (${ placeholders })
		`)
		.all(...uniqueMediaIds)
		.map((row) => (row as MediaIdRow).mediaId);
}
