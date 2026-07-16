import type {
	DownloadSearchBuilderState,
	DownloadSearchSettings,
} from "@nimlat/types/download-search";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	DownloadSearchFacade,
	GroupExplorerFacade,
} from "../../../facades";
import {
	createMediaDownloadQueryPreset,
	deleteMediaDownloadQueryPreset,
	loadDownloadSearchSettings,
	loadMediaDownloadInitialState,
	markMediaDownloadStatusDownloading,
	openMediaDownloadProviderSearch,
	saveMediaDownloadBuilderState,
	setMediaDownloadQueryPresetEnabled,
} from "./media-download-explorer-runner";

function createBuilderState(): DownloadSearchBuilderState {
	return {
		titleLanguage:     "english",
		selectedPresetIds: [ "quality-1080" ],
		customQueryText:   "dual audio",
	};
}

function createSettings(): DownloadSearchSettings {
	return {
		providers:      [],
		keywordPresets: [],
		queryPresets:   [],
		builderState:   createBuilderState(),
		browserConfig:  {
			mode: "system",
		},
	};
}

describe(
	"media download explorer runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads media inspection and download settings together",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"getMediaInspection",
				).mockResolvedValue({
					mediaId:                           42,
					name:                              "Planetes",
					isFilm:                            false,
					supportsMediaPlaybackIssueMoments: false,
					episodes:                          [],
				});
				vi.spyOn(
					DownloadSearchFacade,
					"getSettings",
				).mockResolvedValue(createSettings());

				await expect(loadMediaDownloadInitialState(42)).resolves.toEqual({
					media:    {
						mediaId:                           42,
						name:                              "Planetes",
						isFilm:                            false,
						supportsMediaPlaybackIssueMoments: false,
						episodes:                          [],
					},
					settings: createSettings(),
				});

				expect(GroupExplorerFacade.getMediaInspection).toHaveBeenCalledWith(42);
				expect(DownloadSearchFacade.getSettings).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"persists builder state and opens provider search with media context",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"saveBuilderState",
				).mockResolvedValue();
				vi.spyOn(
					DownloadSearchFacade,
					"openProviderSearch",
				).mockResolvedValue({
					success: true,
					url:     "https://provider.test/search?q=Planetes",
				});

				await expect(saveMediaDownloadBuilderState(
					42,
					createBuilderState(),
					"nyaa",
				)).resolves.toBeUndefined();
				await expect(openMediaDownloadProviderSearch(
					"nyaa",
					"Planetes 1080p",
					42,
				)).resolves.toEqual({
					success: true,
					url:     "https://provider.test/search?q=Planetes",
				});

				expect(DownloadSearchFacade.saveBuilderState).toHaveBeenCalledWith({
					titleLanguage:      "english",
					selectedPresetIds:  [ "quality-1080" ],
					customQueryText:    "dual audio",
					mediaId:            42,
					lastUsedProviderId: "nyaa",
				});
				expect(DownloadSearchFacade.openProviderSearch).toHaveBeenCalledWith({
					providerId: "nyaa",
					query:      "Planetes 1080p",
					mediaId:    42,
				});
			},
		);

		it(
			"persists query preset mutations through the download search facade",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"createQueryPreset",
				).mockResolvedValue({
					id:                "preset-1",
					label:             "1080p dual audio",
					selectedPresetIds: [ "quality-1080" ],
					customQueryText:   "dual audio",
					enabled:           true,
					createdAt:         1,
					updatedAt:         1,
				});
				vi.spyOn(
					DownloadSearchFacade,
					"setQueryPresetEnabled",
				).mockResolvedValue();
				vi.spyOn(
					DownloadSearchFacade,
					"deleteQueryPreset",
				).mockResolvedValue();

				await expect(createMediaDownloadQueryPreset(
					[
						{
							id:        "quality-1080",
							label:     "1080p",
							value:     "1080p",
							category:  "quality",
							isBuiltIn: true,
							enabled:   true,
						},
					],
					createBuilderState(),
					"",
				)).resolves.toEqual({
					id:                "preset-1",
					label:             "1080p dual audio",
					selectedPresetIds: [ "quality-1080" ],
					customQueryText:   "dual audio",
					enabled:           true,
					createdAt:         1,
					updatedAt:         1,
				});
				await expect(setMediaDownloadQueryPresetEnabled(
					"preset-1",
					false,
				)).resolves.toBeUndefined();
				await expect(deleteMediaDownloadQueryPreset("preset-1")).resolves.toBeUndefined();

				expect(DownloadSearchFacade.createQueryPreset).toHaveBeenCalledWith({
					label:             "1080p + dual + audio",
					selectedPresetIds: [ "quality-1080" ],
					customQueryText:   "dual audio",
				});
				expect(DownloadSearchFacade.setQueryPresetEnabled).toHaveBeenCalledWith(
					"preset-1",
					false,
				);
				expect(DownloadSearchFacade.deleteQueryPreset).toHaveBeenCalledWith("preset-1");
			},
		);

		it(
			"marks media as downloading through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(markMediaDownloadStatusDownloading(42)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           42,
					integrationStatus: "downloading",
				});
			},
		);

		it(
			"delegates settings reads to the download search facade",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"getSettings",
				).mockResolvedValue(createSettings());

				await expect(loadDownloadSearchSettings()).resolves.toEqual(createSettings());

				expect(DownloadSearchFacade.getSettings).toHaveBeenCalledTimes(1);
			},
		);
	},
);
