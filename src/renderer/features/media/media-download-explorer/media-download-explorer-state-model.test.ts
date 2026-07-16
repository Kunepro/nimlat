// @vitest-environment node

import type {
	DownloadSearchKeywordPreset,
	DownloadSearchSettings,
} from "@nimlat/types/download-search";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyMediaDownloadIntegrationStatus,
	formatMediaDownloadActionError,
} from "./media-download-action-model";
import {
	createDownloadSearchBuilderStateSaveRequest,
	createDownloadSearchTitleDraftForLanguage,
	replaceDownloadSearchAudioCodecPreset,
	replaceDownloadSearchCategoryPreset,
	setDownloadSearchBuilderCustomQueryText,
	setDownloadSearchBuilderTitleLanguage,
	toggleDownloadSearchAudioFlagPreset,
} from "./media-download-builder-state-model";
import {
	createDownloadSearchProviderOpenRequest,
	createDownloadSearchProviderPresetSearchPlan,
} from "./media-download-provider-search-model";
import {
	createDownloadSearchQueryPresetRequest,
	rollbackDownloadSearchQueryPresetEnabled,
	setDownloadSearchQueryPresetEnabled,
} from "./media-download-query-preset-model";
import {
	createDownloadSearchSettingsSnapshot,
	createMediaDownloadExplorerDerivedState,
	createMediaDownloadInitialStateSnapshot,
	getActiveDownloadSearchQueryPresets,
	getEnabledDownloadSearchKeywordPresets,
	getEnabledDownloadSearchProviders,
	getSelectedDownloadSearchPresets,
} from "./media-download-settings-model";

const keywordPresets: DownloadSearchKeywordPreset[] = [
	{
		id:        "resolution-1080",
		label:     "1080p",
		category:  "quality",
		value:     "1080p",
		isBuiltIn: true,
		enabled:   true,
	},
	{
		id:        "resolution-720",
		label:     "720p",
		category:  "quality",
		value:     "720p",
		isBuiltIn: true,
		enabled:   true,
	},
	{
		id:        "audio-aac",
		label:     "AAC",
		category:  "audio",
		value:     "AAC",
		isBuiltIn: true,
		enabled:   true,
	},
	{
		id:        "audio-flac",
		label:     "FLAC",
		category:  "audio",
		value:     "FLAC",
		isBuiltIn: true,
		enabled:   true,
	},
	{
		id:        "audio-51",
		label:     "5.1",
		category:  "audio",
		value:     "5.1",
		isBuiltIn: true,
		enabled:   true,
	},
	{
		id:        "source-disabled",
		label:     "Disabled",
		category:  "source",
		value:     "disabled",
		isBuiltIn: true,
		enabled:   false,
	},
];

function createDownloadSearchSettings(patch: Partial<DownloadSearchSettings> = {}): DownloadSearchSettings {
	return {
		providers:     [
			{
				id:        "nyaa",
				label:     "Nyaa",
				baseUrl:   "https://nyaa.test/?q={query}",
				category:  "torrent",
				isBuiltIn: true,
				enabled:   true,
				sortOrder: 0,
			},
			{
				id:        "disabled-provider",
				label:     "Disabled Provider",
				baseUrl:   "https://disabled.test/?q={query}",
				category:  "torrent",
				isBuiltIn: false,
				enabled:   false,
				sortOrder: 1,
			},
		],
		keywordPresets,
		queryPresets:  [
			{
				id:                "season-pack",
				label:             "Season Pack",
				selectedPresetIds: [ "resolution-1080" ],
				customQueryText:   "batch",
				enabled:           true,
				createdAt:         1,
				updatedAt:         1,
			},
			{
				id:                "disabled-query",
				label:             "Disabled Query",
				selectedPresetIds: [],
				customQueryText:   "",
				enabled:           false,
				createdAt:         2,
				updatedAt:         2,
			},
		],
		builderState:  {
			titleLanguage:     "english",
			selectedPresetIds: [ "resolution-1080" ],
			customQueryText:   "dual audio",
		},
		browserConfig: {
			mode: "system",
		},
		...patch,
	};
}

describe(
	"media-download explorer models",
	() => {
		it(
			"derives enabled and selected download search collections",
			() => {
				expect(getEnabledDownloadSearchProviders([
					{
						id:        "enabled",
						label:     "Enabled",
						baseUrl:   "https://example.test/{query}",
						category:  "torrent",
						isBuiltIn: true,
						enabled:   true,
						sortOrder: 0,
					},
					{
						id:        "disabled",
						label:     "Disabled",
						baseUrl:   "https://disabled.test/{query}",
						category:  "torrent",
						isBuiltIn: true,
						enabled:   false,
						sortOrder: 1,
					},
				])).toHaveLength(1);
				expect(getEnabledDownloadSearchKeywordPresets(keywordPresets)).toHaveLength(5);
				expect(getActiveDownloadSearchQueryPresets([
					{
						id:                "active",
						label:             "Active",
						selectedPresetIds: [],
						customQueryText:   "",
						enabled:           true,
						createdAt:         1,
						updatedAt:         1,
					},
					{
						id:                "inactive",
						label:             "Inactive",
						selectedPresetIds: [],
						customQueryText:   "",
						enabled:           false,
						createdAt:         1,
						updatedAt:         1,
					},
				])).toHaveLength(1);
				expect(getSelectedDownloadSearchPresets(
					keywordPresets,
					[
						"resolution-1080",
						"audio-aac",
					],
				).map((preset) => preset.id)).toEqual([
					"resolution-1080",
					"audio-aac",
				]);
			},
		);

		it(
			"projects persisted settings into renderer download search state",
			() => {
				const settings = createDownloadSearchSettings();
				const snapshot = createDownloadSearchSettingsSnapshot(settings);

				expect(snapshot.providers).toBe(settings.providers);
				expect(snapshot.presets.map((preset) => preset.id)).toEqual([
					"resolution-1080",
					"resolution-720",
					"audio-aac",
					"audio-flac",
					"audio-51",
				]);
				expect(snapshot.queryPresets).toBe(settings.queryPresets);
			},
		);

		it(
			"creates the initial media download state snapshot from media and settings",
			() => {
				const settings = createDownloadSearchSettings({
					builderState: {
						titleLanguage:     "native",
						selectedPresetIds: [ "resolution-1080" ],
						customQueryText:   "",
					},
				});
				const media    = {
					mediaId:                           42,
					name:                              "Planetes fallback",
					titleOptions:                      {
						english: "Planetes",
						native:  "Planetes Native",
					},
					isFilm:                            false,
					supportsMediaPlaybackIssueMoments: false,
					episodes:                          [],
				};

				expect(createMediaDownloadInitialStateSnapshot(
					media,
					settings,
				)).toEqual({
					providers:    settings.providers,
					presets:      keywordPresets.filter((preset) => preset.enabled),
					queryPresets: settings.queryPresets,
					builderState: settings.builderState,
					media,
					titleDraft:   "Planetes Native",
				});
			},
		);

		it(
			"creates derived explorer state from the loaded settings and media draft",
			() => {
				const settings = createDownloadSearchSettings();
				const snapshot = createDownloadSearchSettingsSnapshot(settings);

				expect(createMediaDownloadExplorerDerivedState({
					builderState: {
						titleLanguage:     "english",
						selectedPresetIds: [ "resolution-1080" ],
						customQueryText:   "batch",
					},
					media:        {
						mediaId:                           42,
						name:                              "Planetes fallback",
						titleOptions:                      { english: "Planetes" },
						isFilm:                            false,
						supportsMediaPlaybackIssueMoments: false,
						episodes:                          [],
					},
					presets:      snapshot.presets,
					providers:    snapshot.providers,
					queryPresets: snapshot.queryPresets,
					titleDraft:   "",
				})).toEqual({
					activeQueryPresets:  [ snapshot.queryPresets[ 0 ] ],
					currentQueryPreview: "Planetes 1080p batch",
					enabledProviders:    [ snapshot.providers[ 0 ] ],
					selectedPresets:     [ snapshot.presets[ 0 ] ],
					title:               "Planetes",
				});
			},
		);

		it(
			"keeps one preset per category when a category preset is replaced",
			() => {
				expect(replaceDownloadSearchCategoryPreset(
					{
						titleLanguage:     "english",
						selectedPresetIds: [
							"resolution-1080",
							"audio-aac",
						],
						customQueryText:   "dual audio",
					},
					keywordPresets,
					"quality",
					"resolution-720",
				)).toEqual({
					titleLanguage:     "english",
					selectedPresetIds: [
						"audio-aac",
						"resolution-720",
					],
					customQueryText:   "dual audio",
				});
			},
		);

		it(
			"replaces only codec presets while preserving audio flags",
			() => {
				expect(replaceDownloadSearchAudioCodecPreset(
					{
						titleLanguage:     "english",
						selectedPresetIds: [
							"resolution-1080",
							"audio-aac",
							"audio-51",
						],
						customQueryText:   "dual audio",
					},
					keywordPresets,
					"audio-flac",
				)).toEqual({
					titleLanguage:     "english",
					selectedPresetIds: [
						"resolution-1080",
						"audio-51",
						"audio-flac",
					],
					customQueryText:   "dual audio",
				});
			},
		);

		it(
			"toggles audio flag presets idempotently",
			() => {
				expect(toggleDownloadSearchAudioFlagPreset(
					{
						titleLanguage:     "english",
						selectedPresetIds: [ "audio-aac" ],
						customQueryText:   "",
					},
					keywordPresets,
					"5.1",
					true,
				).selectedPresetIds).toEqual([
					"audio-aac",
					"audio-51",
				]);
				expect(toggleDownloadSearchAudioFlagPreset(
					{
						titleLanguage:     "english",
						selectedPresetIds: [
							"audio-aac",
							"audio-51",
						],
						customQueryText:   "",
					},
					keywordPresets,
					"5.1",
					false,
				).selectedPresetIds).toEqual([ "audio-aac" ]);
			},
		);

		it(
			"updates title language and custom query builder state",
			() => {
				const builderState = {
					titleLanguage:     "english" as const,
					selectedPresetIds: [ "resolution-1080" ],
					customQueryText:   "",
				};
				const media        = {
					mediaId:                           42,
					name:                              "Planetes fallback",
					titleOptions:                      {
						english: "Planetes",
						romaji:  "Planetes Romaji",
					},
					isFilm:                            false,
					supportsMediaPlaybackIssueMoments: false,
					episodes:                          [],
				};

				expect(setDownloadSearchBuilderTitleLanguage(
					builderState,
					"romaji",
				)).toEqual({
					...builderState,
					titleLanguage: "romaji",
				});
				expect(createDownloadSearchTitleDraftForLanguage(
					media,
					"romaji",
				)).toBe("Planetes Romaji");
				expect(setDownloadSearchBuilderCustomQueryText(
					builderState,
					"dual audio",
				)).toEqual({
					...builderState,
					customQueryText: "dual audio",
				});
			},
		);

		it(
			"rolls back a query preset toggle only when the failed state is still current",
			() => {
				const presets = [
					{
						id:                "preset-1",
						label:             "Preset 1",
						selectedPresetIds: [],
						customQueryText:   "",
						enabled:           true,
						createdAt:         1,
						updatedAt:         1,
					},
				];
				const toggled = setDownloadSearchQueryPresetEnabled(
					presets,
					"preset-1",
					false,
				);

				expect(rollbackDownloadSearchQueryPresetEnabled(
					toggled,
					"preset-1",
					false,
				)[ 0 ]?.enabled).toBe(true);
				expect(rollbackDownloadSearchQueryPresetEnabled(
					presets,
					"preset-1",
					false,
				)[ 0 ]?.enabled).toBe(true);
			},
		);

		it(
			"builds download search facade request payloads",
			() => {
				const builderState = {
					titleLanguage:     "english" as const,
					selectedPresetIds: [ "resolution-1080" ],
					customQueryText:   "dual audio",
				};

				expect(createDownloadSearchBuilderStateSaveRequest(
					42,
					builderState,
					"nyaa",
				)).toEqual({
					...builderState,
					mediaId:            42,
					lastUsedProviderId: "nyaa",
				});
				expect(createDownloadSearchProviderOpenRequest(
					"nyaa",
					"Planetes 1080p",
					42,
				)).toEqual({
					providerId: "nyaa",
					query:      "Planetes 1080p",
					mediaId:    42,
				});
				expect(createDownloadSearchQueryPresetRequest(
					getSelectedDownloadSearchPresets(
						keywordPresets,
						[ "resolution-1080" ],
					),
					builderState,
					"",
				)).toEqual({
					label:             "1080p + dual + audio",
					selectedPresetIds: [ "resolution-1080" ],
					customQueryText:   "dual audio",
				});
			},
		);

		it(
			"creates a provider preset search plan with unique queries",
			() => {
				expect(createDownloadSearchProviderPresetSearchPlan(
					"Planetes",
					keywordPresets,
					[
						{
							id:                "first",
							label:             "First",
							selectedPresetIds: [ "resolution-1080" ],
							customQueryText:   "batch",
							enabled:           true,
							createdAt:         1,
							updatedAt:         1,
						},
						{
							id:                "duplicate",
							label:             "Duplicate",
							selectedPresetIds: [ "resolution-1080" ],
							customQueryText:   "batch",
							enabled:           true,
							createdAt:         2,
							updatedAt:         2,
						},
					],
				)).toEqual({
					errorMessage: null,
					queries:      [ "Planetes 1080p batch" ],
				});
			},
		);

		it(
			"creates a provider preset search plan error when no presets are available",
			() => {
				expect(createDownloadSearchProviderPresetSearchPlan(
					"Planetes",
					keywordPresets,
					[],
				)).toEqual({
					errorMessage: "Create or enable at least one download search preset before opening links.",
					queries:      [],
				});
			},
		);

		it(
			"treats blank provider preset queries as unavailable",
			() => {
				expect(createDownloadSearchProviderPresetSearchPlan(
					"",
					keywordPresets,
					[
						{
							id:                "blank",
							label:             "Blank",
							selectedPresetIds: [],
							customQueryText:   "   ",
							enabled:           true,
							createdAt:         1,
							updatedAt:         1,
						},
					],
				)).toEqual({
					errorMessage: "Create or enable at least one download search preset before opening links.",
					queries:      [],
				});
			},
		);

		it(
			"applies media download integration status without inventing renderer state",
			() => {
				expect(applyMediaDownloadIntegrationStatus(
					null,
					"downloading",
				)).toBeNull();
				expect(applyMediaDownloadIntegrationStatus(
					{
						mediaId:                           42,
						name:                              "Planetes",
						isFilm:                            false,
						supportsMediaPlaybackIssueMoments: false,
						integrationStatus:                 null,
						episodes:                          [],
					},
					"downloading",
				)?.integrationStatus).toBe("downloading");
			},
		);

		it(
			"formats media download action errors",
			() => {
				expect(formatMediaDownloadActionError(
					new Error("download failed"),
					"fallback",
				)).toBe("download failed");
				expect(formatMediaDownloadActionError(
					"download failed",
					"fallback",
				)).toBe("fallback");
				expect(formatMediaDownloadActionError(
					new Error("   "),
					"fallback",
				)).toBe("fallback");
			},
		);
	},
);
