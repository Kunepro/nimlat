import type { ElectronAPI } from "@nimlat/types/electron-api";
import { renderToStaticMarkup } from "react-dom/server";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import AppUpdatePreferencesSection from "./AppUpdatePreferencesSection";

const controllerMock = vi.hoisted(() => vi.fn());

vi.mock(
	"../hooks/useAppUpdatePreferencesController",
	() => ({ useAppUpdatePreferencesController: controllerMock }),
);
vi.mock(
	"./AppUpdateStatusCard",
	() => ({ default: () => <div data-testid="app-updater"/> }),
);
vi.mock(
	"./AnimeDbUpdateStatusCard",
	() => ({ default: () => <div data-testid="anime-db-updater"/> }),
);
vi.mock(
	"./SourceAvailabilityRightsBlock",
	() => ({ default: () => <div data-testid="source-rights"/> }),
);

function exposeUpdaterVisibility(isIntegratedUpdaterVisible: boolean): void {
	vi.stubGlobal(
		"window",
		{
			electronAPI: {
										 appUpdate: { isIntegratedUpdaterVisible: () => isIntegratedUpdaterVisible },
									 } as unknown as ElectronAPI,
		},
	);
}

describe(
	"AppUpdatePreferencesSection",
	() => {
		beforeEach(() => {
			controllerMock.mockReturnValue({});
		});

		it(
			"hides only the integrated app updater when the preload marks it unavailable",
			() => {
				exposeUpdaterVisibility(false);

				const markup = renderToStaticMarkup(
					<AppUpdatePreferencesSection
						isPreferencesOpen
						onOpenAnimeDbDownload={ vi.fn() }
						onOpenAnimeDbScanner={ vi.fn() }
					/>,
				);

				expect(markup).not.toContain("data-testid=\"app-updater\"");
				expect(markup).toContain("data-testid=\"anime-db-updater\"");
			},
		);

		it(
			"shows the integrated app updater on supported platforms",
			() => {
				exposeUpdaterVisibility(true);

				const markup = renderToStaticMarkup(
					<AppUpdatePreferencesSection
						isPreferencesOpen
						onOpenAnimeDbDownload={ vi.fn() }
						onOpenAnimeDbScanner={ vi.fn() }
					/>,
				);

				expect(markup).toContain("data-testid=\"app-updater\"");
			},
		);
	},
);
