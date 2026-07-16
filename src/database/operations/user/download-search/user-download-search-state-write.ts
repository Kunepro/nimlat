import type {
	DownloadBrowserConfig,
	SaveDownloadSearchBuilderStateRequest,
} from "@nimlat/types/download-search";
import { getDatabase } from "../../../utils/get-db";

export function saveDownloadSearchBuilderState(request: SaveDownloadSearchBuilderStateRequest): void {
	const now = Date.now();
	getDatabase().transaction(() => {
		// noinspection SqlResolve
		getDatabase()
			.prepare(`
                INSERT INTO userDownloadSearchBuilderState (id, titleLanguage, selectedPresetIdsJson, customQueryText, updatedAt)
                VALUES (1, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET titleLanguage = excluded.titleLanguage,
                                                selectedPresetIdsJson = excluded.selectedPresetIdsJson,
                                                customQueryText = excluded.customQueryText,
                                                updatedAt = excluded.updatedAt
			`)
			.run(
				request.titleLanguage,
				JSON.stringify(request.selectedPresetIds),
				request.customQueryText,
				now,
			);

		if (typeof request.mediaId === "number" && request.lastUsedProviderId) {
			// noinspection SqlResolve
			getDatabase()
				.prepare(`
                    INSERT INTO userDownloadSearchMediaState (mediaId, lastUsedProviderId, updatedAt)
                    VALUES (?, ?, ?)
                    ON CONFLICT(mediaId) DO UPDATE SET lastUsedProviderId = excluded.lastUsedProviderId,
                                                       updatedAt = excluded.updatedAt
				`)
				.run(
					request.mediaId,
					request.lastUsedProviderId,
					now,
				);
		}
	})();
}

export function saveDownloadBrowserConfig(config: DownloadBrowserConfig): void {
	// noinspection SqlResolve
	getDatabase()
		.prepare(`
            INSERT INTO userDownloadBrowserConfig (id, mode, executablePath, updatedAt)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET mode = excluded.mode,
                                            executablePath = excluded.executablePath,
                                            updatedAt = excluded.updatedAt
		`)
		.run(
			config.mode,
			config.mode === "custom" ? config.executablePath?.trim() || null : null,
			Date.now(),
		);
}
