import {
	useCallback,
	useEffect,
	useState,
} from "react";
import { LIBRARY_SEARCH_COMMIT_DELAY_MS } from "../library-header-actions-model";

interface UseDebouncedSearchDraftOptions {
	onSearchChange: (search: string) => void;
}

interface UseDebouncedSearchDraftResult {
	draftSearch: string;
	handleSearchDraftChange: (nextSearch: string) => void;
}

export function useDebouncedSearchDraft({
																					onSearchChange,
																				}: UseDebouncedSearchDraftOptions): UseDebouncedSearchDraftResult {
	// The shell owns the committed search term while this hook owns fast local typing.
	// Empty drafts still commit immediately so clearing search resets the wall without delay.
	const [ draftSearch, setDraftSearch ]   = useState("");
	const [ hasUserTyped, setHasUserTyped ] = useState(false);

	useEffect(
		() => {
			if (!hasUserTyped || draftSearch.length === 0) {
				return undefined;
			}

			const timeoutId = window.setTimeout(
				() => onSearchChange(draftSearch),
				LIBRARY_SEARCH_COMMIT_DELAY_MS,
			);

			return () => window.clearTimeout(timeoutId);
		},
		[
			draftSearch,
			hasUserTyped,
			onSearchChange,
		],
	);

	const handleSearchDraftChange = useCallback(
		(nextSearch: string) => {
			setHasUserTyped(true);
			setDraftSearch(nextSearch);
			if (nextSearch.length === 0) {
				onSearchChange("");
			}
		},
		[ onSearchChange ],
	);

	return {
		draftSearch,
		handleSearchDraftChange,
	};
}
