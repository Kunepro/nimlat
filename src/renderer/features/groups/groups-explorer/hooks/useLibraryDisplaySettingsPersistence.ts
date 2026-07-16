import type { LibraryDisplayFilters } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { useAppMessage } from "../../../../hooks";
import { formatLibraryDisplaySettingsError } from "../library-display-settings-model";
import { saveLibraryDisplayFilters } from "../library-display-settings-runner";

export interface LibraryDisplaySettingsPersistenceController {
	notifyLibraryDisplaySettingsError: (error: unknown, fallbackMessage: string) => void;
	persistLibraryFilters: (nextFilters: LibraryDisplayFilters) => void;
}

// Centralizes settings persistence and message formatting so loader/action hooks
// can dispatch state changes without owning UI notification details.
export function useLibraryDisplaySettingsPersistence(): LibraryDisplaySettingsPersistenceController {
	const messageApi                        = useAppMessage();
	const notifyLibraryDisplaySettingsError = useCallback(
		(
			error: unknown,
			fallbackMessage: string,
		) => {
			messageApi.error(formatLibraryDisplaySettingsError(
				error,
				fallbackMessage,
			));
		},
		[ messageApi ],
	);
	const persistLibraryFilters             = useCallback(
		(nextFilters: LibraryDisplayFilters) => {
			saveLibraryDisplayFilters(nextFilters).catch((error: unknown) => {
				notifyLibraryDisplaySettingsError(
					error,
					"Failed to save library display filters.",
				);
			});
		},
		[ notifyLibraryDisplaySettingsError ],
	);

	return {
		notifyLibraryDisplaySettingsError,
		persistLibraryFilters,
	};
}
