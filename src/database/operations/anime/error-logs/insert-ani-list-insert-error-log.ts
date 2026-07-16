import { typeSafeError } from "@nimlat/functions";
import { Database } from "better-sqlite3";

type InsertAniListInsertErrorLogParams = {
	idAniList?: number | null;
	payload: unknown;
	error: unknown;
};

function stringifyPayload(payload: unknown): string {
	try {
		return JSON.stringify(payload);
	} catch {
		return JSON.stringify({ serializationError: true });
	}
}

export function insertAniListInsertErrorLog(
	db: Database,
	params: InsertAniListInsertErrorLogParams,
): void {
	const tsError      = typeSafeError(params.error);
	const errorMessage = tsError.stack ? `${ tsError.message }\n${ tsError.stack }` : tsError.message;

	// noinspection SqlResolve
	const insertErrorLog = db.prepare(`
      INSERT INTO anime_data.aniListInsertErrorLogs (idAniList, payload, errorMsg, occurredAt)
      VALUES (?, ?, ?, ?)
	`);

	insertErrorLog.run(
		params.idAniList ?? null,
		stringifyPayload(params.payload),
		errorMessage,
		Date.now(),
	);
}
