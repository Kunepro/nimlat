import { KEY_USER_DB_LIBRARY_DISPLAY_FILTERS } from "@nimlat/constants/main/database-user-keys";
import {
	DEFAULT_LIBRARY_DISPLAY_FILTERS,
	isLibraryAdultFilter,
	isLibraryDisplayMode,
	LibraryDisplayFilters,
} from "@nimlat/types/user-config";
import { getDatabase } from "../../../utils/get-db";

interface LibraryDisplayFiltersSettingValue {
	settingValue: string | null | undefined;
}

function parseLibraryDisplayFilters(value: string | null | undefined): LibraryDisplayFilters {
	if (!value) {
		return DEFAULT_LIBRARY_DISPLAY_FILTERS;
	}

	try {
		const parsed = JSON.parse(value) as Partial<LibraryDisplayFilters>;
		return {
			adultFilter: isLibraryAdultFilter(parsed.adultFilter)
										 ? parsed.adultFilter
										 : DEFAULT_LIBRARY_DISPLAY_FILTERS.adultFilter,
			displayMode: isLibraryDisplayMode(parsed.displayMode)
										 ? parsed.displayMode
										 : DEFAULT_LIBRARY_DISPLAY_FILTERS.displayMode,
			genreNames:  [],
			tagNames:    [],
		};
	} catch {
		return DEFAULT_LIBRARY_DISPLAY_FILTERS;
	}
}

export function getLibraryDisplayFilters(): LibraryDisplayFilters {
	const result = getDatabase()
		.prepare(`SELECT settingValue
              FROM config
              WHERE settingKey = ?;`)
		.get(KEY_USER_DB_LIBRARY_DISPLAY_FILTERS) as LibraryDisplayFiltersSettingValue | undefined;

	return parseLibraryDisplayFilters(result?.settingValue);
}

export function setLibraryDisplayFilters(filters: Partial<LibraryDisplayFilters> = {}): void {
	const normalizedFilters: LibraryDisplayFilters = {
		adultFilter: isLibraryAdultFilter(filters.adultFilter)
									 ? filters.adultFilter
									 : DEFAULT_LIBRARY_DISPLAY_FILTERS.adultFilter,
		displayMode: isLibraryDisplayMode(filters.displayMode)
									 ? filters.displayMode
									 : DEFAULT_LIBRARY_DISPLAY_FILTERS.displayMode,
		// Library tag/genre filters live in the route search so they remain visible and shareable
		// instead of becoming a hidden startup preference.
		genreNames: [],
		tagNames:   [],
	};

	getDatabase()
		.prepare(
			`INSERT INTO config (settingKey, settingValue)
       VALUES (?, ?)
       ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
		)
		.run(
			KEY_USER_DB_LIBRARY_DISPLAY_FILTERS,
			JSON.stringify(normalizedFilters),
		);
}
