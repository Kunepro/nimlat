import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import type { MutableRefObject } from "react";
import {
	useCallback,
	useRef,
	useState,
} from "react";
import { EMPTY_LIBRARY_FILTER_OPTIONS } from "../library-display-settings-model";

export interface LibraryDisplaySettingsStateController {
	adultFilter: LibraryAdultFilter;
	commitDisplayMode: (nextMode: LibraryDisplayMode) => void;
	displayMode: LibraryDisplayMode;
	displayModeRef: MutableRefObject<LibraryDisplayMode>;
	effectiveAdultFilter: LibraryAdultFilter;
	filterOptions: LibraryFilterOptions;
	isAdultContentEnabled: boolean;
	setAdultContentEnabled: (enabled: boolean) => void;
	setAdultFilter: (filter: LibraryAdultFilter) => void;
	setFilterOptions: (options: LibraryFilterOptions) => void;
}

// Keeps display-mode state mirrored into a ref because adult-content events can
// arrive outside render flow and must persist the current display-mode value.
export function useLibraryDisplaySettingsState(): LibraryDisplaySettingsStateController {
	const [ adultFilter, setAdultFilter ]                   = useState<LibraryAdultFilter>("mixed");
	const [ displayMode, setDisplayMode ]                   = useState<LibraryDisplayMode>("groups");
	const [ filterOptions, setFilterOptions ]               = useState<LibraryFilterOptions>(EMPTY_LIBRARY_FILTER_OPTIONS);
	const [ isAdultContentEnabled, setAdultContentEnabled ] = useState(false);
	const displayModeRef                                    = useRef<LibraryDisplayMode>("groups");
	const effectiveAdultFilter                              = isAdultContentEnabled ? adultFilter : "mixed";

	const commitDisplayMode = useCallback(
		(nextMode: LibraryDisplayMode) => {
			displayModeRef.current = nextMode;
			setDisplayMode(nextMode);
		},
		[],
	);

	return {
		adultFilter,
		commitDisplayMode,
		displayMode,
		displayModeRef,
		effectiveAdultFilter,
		filterOptions,
		isAdultContentEnabled,
		setAdultContentEnabled,
		setAdultFilter,
		setFilterOptions,
	};
}
