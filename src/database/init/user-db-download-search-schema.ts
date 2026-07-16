import {
	BUILT_IN_DOWNLOAD_SEARCH_KEYWORD_PRESETS,
	BUILT_IN_DOWNLOAD_SEARCH_PROVIDERS,
} from "@nimlat/constants/download-search-defaults";
import { KEY_USER_DB_DOWNLOAD_SEARCH_DEFAULTS_SEEDED } from "@nimlat/constants/main/database-user-keys";
import type { Database } from "better-sqlite3";

type CountRow = {
	count: number;
};

type ConfigValueRow = {
	settingValue: string | null;
};

const LEGACY_BUILT_IN_DOWNLOAD_SEARCH_PROVIDER_URLS = [
	{
		id:      "nyaa",
		baseUrl: "https://nyaa.si/?f=0&c=0_0&q=",
	},
	{
		id:      "tokyo-toshokan",
		baseUrl: "https://www.tokyotosho.info/search.php?terms=",
	},
	{
		id:      "anidex",
		baseUrl: "https://anidex.moe/?q=",
	},
	{
		id:      "the-pirate-bay",
		baseUrl: "https://thepiratebay.org/search.php?q=",
	},
] as const;

// Default download-search rows become ordinary user-managed rows after the
// first-install seed. The marker prevents deleted defaults from reappearing.
function seedBuiltInDownloadSearchDefaults(db: Database, now: number): void {
	const seedMarker = db
		.prepare("SELECT settingValue FROM config WHERE settingKey = ?")
		.get(KEY_USER_DB_DOWNLOAD_SEARCH_DEFAULTS_SEEDED) as ConfigValueRow | undefined;
	if (seedMarker?.settingValue === "true") {
		return;
	}

	const providerCount      = db
		.prepare("SELECT COUNT(*) AS count FROM userDownloadSearchProviders")
		.get() as CountRow;
	const keywordPresetCount = db
		.prepare("SELECT COUNT(*) AS count FROM userDownloadSearchKeywordPresets")
		.get() as CountRow;

	// noinspection SqlResolve
	const insertProvider      = db.prepare(`
        INSERT INTO userDownloadSearchProviders (id, label, category, baseUrl, isBuiltIn, enabled, sortOrder, updatedAt)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?)
	`);
	// noinspection SqlResolve
	const insertKeywordPreset = db.prepare(`
        INSERT OR IGNORE INTO userDownloadSearchKeywordPresets (id, label, value, category, isBuiltIn, enabled, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	if (providerCount.count === 0) {
		BUILT_IN_DOWNLOAD_SEARCH_PROVIDERS.forEach((provider) => {
			insertProvider.run(
				provider.id,
				provider.label,
				provider.category,
				provider.baseUrl,
				provider.enabled ? 1 : 0,
				provider.sortOrder,
				now,
			);
		});
	}
	if (keywordPresetCount.count === 0) {
		BUILT_IN_DOWNLOAD_SEARCH_KEYWORD_PRESETS.forEach((preset) => {
			insertKeywordPreset.run(
				preset.id,
				preset.label,
				preset.value,
				preset.category,
				preset.isBuiltIn ? 1 : 0,
				preset.enabled ? 1 : 0,
				now,
			);
		});
	}

	db.prepare(`
        INSERT INTO config (settingKey, settingValue)
        VALUES (?, 'true')
        ON CONFLICT(settingKey) DO UPDATE SET settingValue = 'true'
	`).run(KEY_USER_DB_DOWNLOAD_SEARCH_DEFAULTS_SEEDED);
}

// Make the insertion point visible in untouched seeded examples without
// overwriting provider URLs that the user edited or recreating deleted rows.
function reconcileLegacyDownloadSearchProviderUrlTemplates(db: Database, now: number): void {
	// noinspection SqlResolve
	const updateLegacyUrl = db.prepare(`
      UPDATE userDownloadSearchProviders
      SET baseUrl   = ?,
          updatedAt = ?
      WHERE id = ?
        AND baseUrl = ?
	`);

	LEGACY_BUILT_IN_DOWNLOAD_SEARCH_PROVIDER_URLS.forEach((legacyProvider) => {
		const currentProvider = BUILT_IN_DOWNLOAD_SEARCH_PROVIDERS.find(
			(provider) => provider.id === legacyProvider.id,
		);
		if (!currentProvider) {
			return;
		}
		updateLegacyUrl.run(
			currentProvider.baseUrl,
			now,
			legacyProvider.id,
			legacyProvider.baseUrl,
		);
	});
}

export function initUserDownloadSearchSchema(db: Database): void {
	// Download search stores user-editable URL builders and query terms only.
	// Provider websites are never fetched or cached by this schema.
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadSearchProviders:
        -- User-editable provider URL templates for manual browser searches. This
        -- stores configuration only; the app does not scrape provider sites.
        -- Default providers are inserted once on first install, then behave like
        -- ordinary user rows so users can edit or delete them permanently.
        -- sortOrder is the stable presentation order and is intentionally separate
        -- from labels/categories so future drag/drop reordering will not fight edits.
        CREATE TABLE IF NOT EXISTS userDownloadSearchProviders
        (
            id        TEXT PRIMARY KEY,
            label     TEXT    NOT NULL,
            category  TEXT    NOT NULL,
            baseUrl   TEXT    NOT NULL,
            isBuiltIn BOOLEAN NOT NULL DEFAULT 0,
            enabled   BOOLEAN NOT NULL DEFAULT 1,
            sortOrder INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadSearchKeywordPresets:
        -- Built-in and user-created reusable query terms. Enabled/category fields
        -- control the query builder without touching provider definitions.
        CREATE TABLE IF NOT EXISTS userDownloadSearchKeywordPresets
        (
            id        TEXT PRIMARY KEY,
            label     TEXT    NOT NULL,
            value     TEXT    NOT NULL,
            category  TEXT    NOT NULL,
            isBuiltIn BOOLEAN NOT NULL DEFAULT 0,
            enabled   BOOLEAN NOT NULL DEFAULT 1,
            updatedAt INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadSearchBuilderState:
        -- Singleton UI builder state for the download search panel. id is fixed to
        -- 1 so the renderer restores exactly one last-used draft.
        CREATE TABLE IF NOT EXISTS userDownloadSearchBuilderState
        (
            id                    INTEGER PRIMARY KEY CHECK (id = 1),
            titleLanguage         TEXT    NOT NULL DEFAULT 'english',
            selectedPresetIdsJson TEXT    NOT NULL DEFAULT '[]',
            customQueryText       TEXT    NOT NULL DEFAULT '',
            updatedAt             INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadSearchQueryPresets:
        -- Saved complete search-query presets. Stores selected keyword IDs plus
        -- custom text so users can reuse common search shapes.
        CREATE TABLE IF NOT EXISTS userDownloadSearchQueryPresets
        (
            id                    TEXT PRIMARY KEY,
            label                 TEXT    NOT NULL,
            selectedPresetIdsJson TEXT    NOT NULL DEFAULT '[]',
            customQueryText       TEXT    NOT NULL DEFAULT '',
            enabled               BOOLEAN NOT NULL DEFAULT 1,
            createdAt             INTEGER NOT NULL,
            updatedAt             INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadSearchMediaState:
        -- Last-used download-search provider per media for faster repeated searches.
        CREATE TABLE IF NOT EXISTS userDownloadSearchMediaState
        (
            mediaId            INTEGER PRIMARY KEY,
            lastUsedProviderId TEXT,
            updatedAt          INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userDownloadBrowserConfig:
        -- Singleton browser-launch configuration for manual searches. Keeps the
        -- executable path user-local and never stores provider credentials.
        CREATE TABLE IF NOT EXISTS userDownloadBrowserConfig
        (
            id             INTEGER PRIMARY KEY CHECK (id = 1),
            mode           TEXT NOT NULL DEFAULT 'system',
            executablePath TEXT,
            updatedAt      INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO userDownloadSearchBuilderState (id, updatedAt)
        VALUES (1, ${ Date.now() });
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO userDownloadBrowserConfig (id, mode, updatedAt)
        VALUES (1, 'system', ${ Date.now() });
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO userDownloadSearchQueryPresets (id, label, selectedPresetIdsJson, customQueryText,
                                                              enabled, createdAt, updatedAt)
        VALUES ('query-preset-base-default', 'Base', '[]', '', 1, ${ Date.now() }, ${ Date.now() });
	`);

	seedBuiltInDownloadSearchDefaults(
		db,
		Date.now(),
	);
	reconcileLegacyDownloadSearchProviderUrlTemplates(
		db,
		Date.now(),
	);
}
