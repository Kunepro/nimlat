import type { LibraryDisplayFilters } from "@nimlat/types/ipc-payloads";
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import {
	getIsAdultContentEnabled,
	setIsAdultContentEnabled,
} from "./config/adult-content";
import {
	getBackgroundStyle,
	setBackgroundStyle,
} from "./config/background-style";
import {
	getIsCanvasDiagnosticsEnabled,
	setIsCanvasDiagnosticsEnabled,
} from "./config/canvas-diagnostics";
import {
	getLibraryDisplayFilters,
	setLibraryDisplayFilters,
} from "./config/library-display-filters";
import {
	getPreferredTitleLanguage,
	setPreferredTitleLanguage,
} from "./config/preferred-title-language";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Renderer preference config stores durable UI choices. Renderer components use
// services/facades, while DB reads keep defaults and serialization in one place.
export const UserDbConfigPreferencesFacade = {
	// Read whether adult-marked content should be visible in renderer list queries.
	isAdultContentEnabled: (): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.isAdultContentEnabled",
			() => getIsAdultContentEnabled(),
		);
	},

	// Persist whether adult-marked content is visible in renderer list queries.
	setAdultContentEnabled: (enabled: boolean): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setAdultContentEnabled",
			() => setIsAdultContentEnabled(enabled),
			{ enabled },
		);
	},

	// Read the animated background style used by the app shell.
	getBackgroundStyle: (): BackgroundStyle => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getBackgroundStyle",
			() => getBackgroundStyle(),
		);
	},

	// Persist the selected animated background style; renderer IPC broadcasts the live switch.
	setBackgroundStyle: (style: BackgroundStyle): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setBackgroundStyle",
			() => setBackgroundStyle(style),
			{ style },
		);
	},

	// Preferred title language affects anime/media/episode labels only, never the UX locale.
	getPreferredTitleLanguage: (): PreferredTitleLanguage => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getPreferredTitleLanguage",
			() => getPreferredTitleLanguage(),
		);
	},

	// Persist the user's title-variant preference; custom title overrides still win at read time.
	setPreferredTitleLanguage: (language: PreferredTitleLanguage): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setPreferredTitleLanguage",
			() => setPreferredTitleLanguage(language),
			{ language },
		);
	},

	// Read the opt-in media-wall diagnostics overlay flag. Dev mode gates visibility in renderer.
	isCanvasDiagnosticsEnabled: (): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.isCanvasDiagnosticsEnabled",
			() => getIsCanvasDiagnosticsEnabled(),
		);
	},

	// Persist the opt-in media-wall diagnostics overlay flag.
	setCanvasDiagnosticsEnabled: (enabled: boolean): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setCanvasDiagnosticsEnabled",
			() => setIsCanvasDiagnosticsEnabled(enabled),
			{ enabled },
		);
	},

	// Read Library display filters used to restore the persisted search-adjacent controls.
	getLibraryDisplayFilters: (): LibraryDisplayFilters => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getLibraryDisplayFilters",
			() => getLibraryDisplayFilters(),
		);
	},

	// Persist Library display filters as one config value so paired choices stay in sync.
	setLibraryDisplayFilters: (filters: LibraryDisplayFilters): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setLibraryDisplayFilters",
			() => setLibraryDisplayFilters(filters),
			{ filters },
		);
	},
} as const;
