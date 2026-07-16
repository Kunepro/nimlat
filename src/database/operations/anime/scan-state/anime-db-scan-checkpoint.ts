import { getDatabase } from "../../../utils/get-db";

export interface AnimeDbScanCheckpoint {
	version: 2;
	// Legacy/display window ordinal. Never use it to build an AniList request.
	lastCompletedPage: number;
	// Durable upper ID bound of the last completely persisted scanner window.
	lastPersistedMediaId: number;
	updatedAt: number;
}

type ScanStateRow = {
	settingValue: string | null | undefined;
};

const SCAN_STATE_KEY = "animeDbScanCheckpoint";

// Persist only a fully committed scanner window. Callers must not save partial
// media progress because resume deliberately replays the active window.
export function saveAnimeDbScanCheckpoint(checkpoint: AnimeDbScanCheckpoint): void {
	const db = getDatabase();
	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO anime_data.scanState (settingKey, settingValue)
      VALUES (?, ?)
      ON CONFLICT(settingKey)
          DO UPDATE SET settingValue = excluded.settingValue;
	`).run(
		SCAN_STATE_KEY,
		JSON.stringify(checkpoint),
	);
}

// Load and normalize the full-scan checkpoint; missing or structurally invalid
// state returns null so the coordinator starts from a clean cursor.
export function loadAnimeDbScanCheckpoint(): AnimeDbScanCheckpoint | null {
	const db  = getDatabase();
	const row = db.prepare<[
		string
	], ScanStateRow>(`
      SELECT settingValue
      FROM anime_data.scanState
      WHERE settingKey = ?;
	`).get(SCAN_STATE_KEY);

	if (!row?.settingValue) {
		return null;
	}

	const parsed = JSON.parse(row.settingValue) as Partial<AnimeDbScanCheckpoint> & {
		// V1 stored this equivalent durable ID field under its original name.
		lastProcessedId?: number;
	};
	const resolvedCheckpoint = resolvePersistedCheckpoint(parsed);
	if (!resolvedCheckpoint) {
		return null;
	}

	return resolvedCheckpoint;
}

function resolvePersistedCheckpoint(parsed: {
	version?: number;
	lastCompletedPage?: number;
	lastPersistedMediaId?: number;
	lastProcessedId?: number;
	updatedAt?: number;
}): AnimeDbScanCheckpoint | null {
	if (
		parsed.version === 2
		&& typeof parsed.lastCompletedPage === "number"
		&& parsed.lastCompletedPage >= 0
		&& typeof parsed.lastPersistedMediaId === "number"
		&& parsed.lastPersistedMediaId >= 0
	) {
		return {
			version:              2,
			lastCompletedPage:    parsed.lastCompletedPage,
			lastPersistedMediaId: parsed.lastPersistedMediaId,
			updatedAt:            typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
		};
	}

	// Promote the durable V1 ID cursor. Its missing window ordinal is reset because
	// that value is display-only; the scanner can resume safely from the ID bound.
	if (
		parsed.version === 1
		&& (typeof parsed.lastPersistedMediaId === "number" || typeof parsed.lastProcessedId === "number")
	) {
		return {
			version:              2,
			lastCompletedPage:    0,
			lastPersistedMediaId: typeof parsed.lastPersistedMediaId === "number"
															? Math.max(
					0,
					parsed.lastPersistedMediaId,
				)
															: Math.max(
					0,
					parsed.lastProcessedId ?? 0,
				),
			updatedAt:            typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
		};
	}

	return null;
}

// Keep the singleton setting row but null its value so reset remains an atomic upsert.
export function clearAnimeDbScanCheckpoint(): void {
	const db = getDatabase();
	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO anime_data.scanState (settingKey, settingValue)
      VALUES (?, NULL)
      ON CONFLICT(settingKey)
          DO UPDATE SET settingValue = NULL;
	`).run(SCAN_STATE_KEY);
}
