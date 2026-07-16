import type {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchQueryPresetRequest,
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import { getDatabase } from "../../../utils/get-db";

function createDownloadSearchIdSlug(value: string): string {
	return value.toLowerCase().replace(
		/[^a-z0-9]+/g,
		"-",
	).replace(
		/^-|-$/g,
		"",
	);
}

export function createDownloadSearchKeywordPreset(request: CreateDownloadSearchKeywordPresetRequest): DownloadSearchKeywordPreset {
	const now    = Date.now();
	const label  = request.label.trim();
	const value  = request.value.trim();
	const idBase = `${ request.category }-${ createDownloadSearchIdSlug(value) }`;
	const preset = {
		id:        `${ idBase }-${ now }`,
		label,
		value,
		category:  request.category,
		isBuiltIn: false,
		enabled:   true,
	};
	// noinspection SqlResolve
	getDatabase()
		.prepare(`
            INSERT INTO userDownloadSearchKeywordPresets (id, label, value, category, isBuiltIn, enabled, updatedAt)
            VALUES (?, ?, ?, ?, 0, 1, ?)
		`)
		.run(
			preset.id,
			preset.label,
			preset.value,
			preset.category,
			now,
		);
	return preset;
}

export function createDownloadSearchQueryPreset(request: CreateDownloadSearchQueryPresetRequest): DownloadSearchQueryPreset {
	const now    = Date.now();
	const label  = request.label.trim();
	const preset = {
		id:                `query-preset-${ createDownloadSearchIdSlug(label) }-${ now }`,
		label,
		selectedPresetIds: Array.from(new Set(request.selectedPresetIds)),
		customQueryText:   request.customQueryText.trim(),
		enabled:           true,
		createdAt:         now,
		updatedAt:         now,
	};
	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        INSERT INTO userDownloadSearchQueryPresets (id, label, selectedPresetIdsJson, customQueryText, enabled,
                                                    createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, ?, ?)
		`)
		.run(
			preset.id,
			preset.label,
			JSON.stringify(preset.selectedPresetIds),
			preset.customQueryText,
			now,
			now,
		);
	return preset;
}

export function updateDownloadSearchQueryPresetEnabled(presetId: string, enabled: boolean): void {
	// noinspection SqlResolve
	getDatabase()
		.prepare("UPDATE userDownloadSearchQueryPresets SET enabled = ?, updatedAt = ? WHERE id = ?")
		.run(
			enabled ? 1 : 0,
			Date.now(),
			presetId,
		);
}

export function deleteDownloadSearchQueryPreset(presetId: string): void {
	getDatabase()
		.prepare("DELETE FROM userDownloadSearchQueryPresets WHERE id = ?")
		.run(presetId);
}
