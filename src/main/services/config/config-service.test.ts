// @vitest-environment node
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import { Subject } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let adultContentChangedBus: Subject<boolean>;
let backgroundStyleChangedBus: Subject<BackgroundStyle>;
let preferredTitleLanguageChangedBus: Subject<PreferredTitleLanguage>;
let canvasDiagnosticsChangedBus: Subject<boolean>;

const configFacade = {
	getAnimeDbVersion:           vi.fn(),
	setAnimeDbVersion:           vi.fn(),
	isAdultContentEnabled:       vi.fn(),
	setAdultContentEnabled:      vi.fn(),
	getBackgroundStyle:          vi.fn(),
	setBackgroundStyle:          vi.fn(),
	isDevModeEnabled:            vi.fn(),
	isAdminModeEnabled:          vi.fn(),
	getPreferredTitleLanguage:   vi.fn(),
	setPreferredTitleLanguage:   vi.fn(),
	isCanvasDiagnosticsEnabled:  vi.fn(),
	setCanvasDiagnosticsEnabled: vi.fn(),
	getLibraryDisplayFilters:    vi.fn(),
	setLibraryDisplayFilters:    vi.fn(),
	getLastRoute:                vi.fn(),
	setLastRoute:                vi.fn(),
};

describe(
	"ConfigService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			adultContentChangedBus           = new Subject<boolean>();
			backgroundStyleChangedBus        = new Subject<BackgroundStyle>();
			preferredTitleLanguageChangedBus = new Subject<PreferredTitleLanguage>();
			canvasDiagnosticsChangedBus      = new Subject<boolean>();

			vi.doMock(
				"@nimlat/database",
				() => ({
					UserDbFacade: {
						config: configFacade,
					},
				}),
			);
			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ConfigAdultContentChanged:           adultContentChangedBus,
					BUS_ConfigBackgroundStyleChanged:        backgroundStyleChangedBus,
					BUS_ConfigCanvasDiagnosticsChanged:      canvasDiagnosticsChangedBus,
					BUS_ConfigPreferredTitleLanguageChanged: preferredTitleLanguageChangedBus,
				}),
			);
		});

		it(
			"persists settings before publishing renderer-visible config events",
			async () => {
				const eventOrder: string[] = [];
				configFacade.setAdultContentEnabled.mockImplementation(() => {
					eventOrder.push("persist-adult");
				});
				configFacade.setBackgroundStyle.mockImplementation(() => {
					eventOrder.push("persist-background");
				});
				configFacade.setPreferredTitleLanguage.mockImplementation(() => {
					eventOrder.push("persist-title-language");
				});
				configFacade.setCanvasDiagnosticsEnabled.mockImplementation(() => {
					eventOrder.push("persist-canvas");
				});
				adultContentChangedBus.subscribe(value => eventOrder.push(`adult:${ String(value) }`));
				backgroundStyleChangedBus.subscribe(value => eventOrder.push(`background:${ value }`));
				preferredTitleLanguageChangedBus.subscribe(value => eventOrder.push(`title-language:${ value }`));
				canvasDiagnosticsChangedBus.subscribe(value => eventOrder.push(`canvas:${ String(value) }`));
				const { ConfigService } = await import("./config-service");

				ConfigService.setAdultContentEnabled(true);
				ConfigService.setBackgroundStyle("synthwave");
				ConfigService.setPreferredTitleLanguage("romaji");
				ConfigService.setCanvasDiagnosticsEnabled(false);

				expect(eventOrder).toEqual([
					"persist-adult",
					"adult:true",
					"persist-background",
					"background:synthwave",
					"persist-title-language",
					"title-language:romaji",
					"persist-canvas",
					"canvas:false",
				]);
			},
		);

		it(
			"does not publish config events when persistence fails",
			async () => {
				const publishedValues: boolean[] = [];
				configFacade.setAdultContentEnabled.mockImplementation(() => {
					throw new Error("write failed");
				});
				adultContentChangedBus.subscribe(value => publishedValues.push(value));
				const { ConfigService } = await import("./config-service");

				expect(() => ConfigService.setAdultContentEnabled(true)).toThrow("write failed");
				expect(publishedValues).toEqual([]);
			},
		);
	},
);
