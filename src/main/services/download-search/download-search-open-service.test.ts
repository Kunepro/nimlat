// @vitest-environment node
import type {
	DownloadSearchProvider,
	DownloadSearchSettings,
} from "@nimlat/types/download-search";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchOpenService } from "./download-search-open-service";

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: vi.fn(),
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			downloadSearch: {
				getSettings:           vi.fn(),
				saveBuilderState:      vi.fn(),
				saveBrowserConfig:     vi.fn(),
				setProviderEnabled:    vi.fn(),
				createProvider:        vi.fn(),
				updateProvider:        vi.fn(),
				deleteProvider:        vi.fn(),
				createKeywordPreset:   vi.fn(),
				createQueryPreset:     vi.fn(),
				setQueryPresetEnabled: vi.fn(),
				deleteQueryPreset:     vi.fn(),
			},
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		shell: {
			openExternal: vi.fn(),
		},
	}),
);

function createSettings(providerOverrides: Partial<DownloadSearchProvider> = {}): DownloadSearchSettings {
	return {
		providers:      [
			{
				id:        "nyaa",
				label:     "Nyaa",
				category:  "torrent",
				baseUrl:   "https://example.test/search?q={query}",
				isBuiltIn: false,
				enabled:   true,
				sortOrder: 1,
				...providerOverrides,
			},
		],
		keywordPresets: [],
		queryPresets:   [],
		builderState:   {
			titleLanguage:     "romaji",
			selectedPresetIds: [ "quality-1080p" ],
			customQueryText:   "batch",
		},
		browserConfig:  {
			mode: "system",
		},
	};
}

describe(
	"DownloadSearchOpenService",
	() => {
		const openUrl          = vi.fn();
		const getSettings      = vi.fn();
		const saveBuilderState = vi.fn();
		const logOpenError     = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			openUrl.mockResolvedValue(undefined);
			getSettings.mockReturnValue(createSettings());
		});

		it(
			"opens the selected provider and stores the last provider for media-scoped requests",
			async () => {
				const service = new DownloadSearchOpenService(
					{
						getSettings,
						saveBuilderState,
					},
					{ openUrl },
					{ logOpenError },
				);

				await expect(service.openProviderSearch({
					providerId: "nyaa",
					query:      "Frieren 1080p",
					mediaId:    123,
				})).resolves.toEqual({
					success: true,
					url:     "https://example.test/search?q=Frieren%201080p",
				});

				expect(openUrl).toHaveBeenCalledWith(
					{ mode: "system" },
					"https://example.test/search?q=Frieren%201080p",
				);
				expect(saveBuilderState).toHaveBeenCalledWith({
					titleLanguage:      "romaji",
					selectedPresetIds:  [ "quality-1080p" ],
					customQueryText:    "batch",
					mediaId:            123,
					lastUsedProviderId: "nyaa",
				});
				expect(logOpenError).not.toHaveBeenCalled();
			},
		);

		it(
			"does not mutate builder state for generic provider openings",
			async () => {
				const service = new DownloadSearchOpenService(
					{
						getSettings,
						saveBuilderState,
					},
					{ openUrl },
					{ logOpenError },
				);

				await service.openProviderSearch({
					providerId: "nyaa",
					query:      "Frieren",
				});

				expect(saveBuilderState).not.toHaveBeenCalled();
			},
		);

		it(
			"returns a stable failure result when the provider is disabled",
			async () => {
				getSettings.mockReturnValue(createSettings({ enabled: false }));
				const service = new DownloadSearchOpenService(
					{
						getSettings,
						saveBuilderState,
					},
					{ openUrl },
					{ logOpenError },
				);

				await expect(service.openProviderSearch({
					providerId: "nyaa",
					query:      "Frieren",
					mediaId:    123,
				})).resolves.toEqual({
					success: false,
					error:   "Download search provider 'Nyaa' is disabled.",
				});

				expect(openUrl).not.toHaveBeenCalled();
				expect(saveBuilderState).not.toHaveBeenCalled();
				expect(logOpenError).toHaveBeenCalledWith(
					"download-search.open",
					expect.any(Error),
					{
						providerId: "nyaa",
						mediaId:    123,
					},
				);
			},
		);

		it(
			"returns a stable failure result when browser opening fails",
			async () => {
				openUrl.mockRejectedValueOnce(new Error("browser failed"));
				const service = new DownloadSearchOpenService(
					{
						getSettings,
						saveBuilderState,
					},
					{ openUrl },
					{ logOpenError },
				);

				await expect(service.openProviderSearch({
					providerId: "nyaa",
					query:      "Frieren",
				})).resolves.toEqual({
					success: false,
					error:   "browser failed",
				});

				expect(saveBuilderState).not.toHaveBeenCalled();
				expect(logOpenError).toHaveBeenCalledWith(
					"download-search.open",
					expect.any(Error),
					{
						providerId: "nyaa",
						mediaId:    undefined,
					},
				);
			},
		);
	},
);
