import type {
	AnimeDbUpdateBaseline,
	AnimeDbUpdateState,
} from "@nimlat/types/anime-db-update";
import { getDatabase } from "../../../utils/get-db";

type ScanStateRow = {
	settingValue: string | null | undefined;
};

type AnimeDbUpdateBaselineRow = {
	mediaCount: number;
	maxProviderUpdatedAt: number | null;
};

const UPDATE_STATE_KEY = "animeDbUpdateState";

export function saveAnimeDbUpdateState(state: AnimeDbUpdateState): void {
	const db = getDatabase();
	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO anime_data.scanState (settingKey, settingValue)
      VALUES (?, ?)
      ON CONFLICT(settingKey)
          DO UPDATE SET settingValue = excluded.settingValue;
	`).run(
		UPDATE_STATE_KEY,
		JSON.stringify(state),
	);
}

export function loadAnimeDbUpdateState(): AnimeDbUpdateState | null {
	const db  = getDatabase();
	const row = db.prepare<[
		string
	], ScanStateRow>(`
      SELECT settingValue
      FROM anime_data.scanState
      WHERE settingKey = ?;
	`).get(UPDATE_STATE_KEY);

	if (!row?.settingValue) {
		return null;
	}

	const parsed = JSON.parse(row.settingValue) as Partial<AnimeDbUpdateState>;
	return resolvePersistedUpdateState(parsed);
}

export function selectAnimeDbUpdateBaseline(): AnimeDbUpdateBaseline {
	const db  = getDatabase();
	const row = db.prepare<[], AnimeDbUpdateBaselineRow>(`
      SELECT
          COUNT(*)       AS mediaCount,
          MAX(updatedAt) AS maxProviderUpdatedAt
      FROM anime_data.media
      WHERE isStub = 0
        AND idAniList IS NOT NULL;
	`).get();

	return {
		mediaCount:           row?.mediaCount ?? 0,
		maxProviderUpdatedAt: row?.maxProviderUpdatedAt ?? null,
	};
}

function resolvePersistedUpdateState(parsed: Partial<AnimeDbUpdateState>): AnimeDbUpdateState | null {
	if (
		parsed.version !== 1
		|| !isNullableNonNegativeNumber(parsed.lastSuccessfulProviderUpdatedAt)
		|| !isNullablePositiveNumber(parsed.lastKnownTailPage)
		|| !isNullableNonNegativeNumber(parsed.lastSuccessfulRunCompletedAt)
		|| !isUpdateRunStatus(parsed.lastRunStatus)
	) {
		return null;
	}

	return {
		version:                         1,
		lastSuccessfulProviderUpdatedAt: parsed.lastSuccessfulProviderUpdatedAt,
		lastKnownTailPage:               parsed.lastKnownTailPage,
		lastSuccessfulRunCompletedAt:    parsed.lastSuccessfulRunCompletedAt,
		lastRunStatus:                   parsed.lastRunStatus,
		startedAt:                       isNullableNonNegativeNumber(parsed.startedAt) ? parsed.startedAt : null,
		errorMessage:                    typeof parsed.errorMessage === "string" ? parsed.errorMessage : null,
		updatedAt:                       typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
	};
}

function isUpdateRunStatus(value: unknown): value is AnimeDbUpdateState["lastRunStatus"] {
	return value === "idle"
		|| value === "running"
		|| value === "paused"
		|| value === "completed"
		|| value === "error";
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
	return value === null || (typeof value === "number" && value >= 0);
}

function isNullablePositiveNumber(value: unknown): value is number | null {
	return value === null || (typeof value === "number" && value >= 1);
}
