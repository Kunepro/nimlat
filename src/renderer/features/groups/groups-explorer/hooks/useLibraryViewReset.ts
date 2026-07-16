import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { useEffect } from "react";

interface UseLibraryViewResetInput {
	clearSelection: () => void;
	displayMode: LibraryDisplayMode;
	effectiveAdultFilter: LibraryAdultFilter;
	resetVisibleRange: () => void;
	scope: LibraryDisplayScope;
	search: string;
}

// Search/scope/display changes invalidate the visible wall window and selection.
// The wall data key owns data-source changes; this hook owns local shell cleanup.
export function useLibraryViewReset({
																			clearSelection,
																			displayMode,
																			effectiveAdultFilter,
																			resetVisibleRange,
																			scope,
																			search,
																		}: UseLibraryViewResetInput): void {
	useEffect(
		() => {
			resetVisibleRange();
			clearSelection();
		},
		[
			clearSelection,
			displayMode,
			effectiveAdultFilter,
			resetVisibleRange,
			scope,
			search,
		],
	);
}
