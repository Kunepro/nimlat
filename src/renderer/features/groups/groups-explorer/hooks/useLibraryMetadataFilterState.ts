import { LibraryDisplayScope } from "@nimlat/types/ipc-payloads";
import {
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import {
	useCallback,
	useMemo,
} from "react";
import { ROUTES } from "../../../../constants/route-config";
import {
	LibraryMetadataFilters,
	parseLibraryMetadataFilters,
	serializeLibraryMetadataFilterSearch,
} from "../library-metadata-filters";

interface UseLibraryMetadataFilterStateInput {
	scope: LibraryDisplayScope;
}

interface UseLibraryMetadataFilterStateResult {
	metadataFilters: LibraryMetadataFilters;
	handleMetadataFiltersChange: (nextFilters: LibraryMetadataFilters) => void;
}

export function useLibraryMetadataFilterState({
																								scope,
																							}: UseLibraryMetadataFilterStateInput): UseLibraryMetadataFilterStateResult {
	const navigate        = useNavigate();
	const location        = useLocation();
	const isIgnoredScope  = scope === "ignored";
	const metadataFilters = useMemo(
		() => parseLibraryMetadataFilters(location.search),
		[ location.search ],
	);

	const handleMetadataFiltersChange = useCallback(
		(nextFilters: LibraryMetadataFilters) => {
			void navigate({
				to:      isIgnoredScope ? ROUTES.GROUPS.IGNORED_FULL_URL : ROUTES.GROUPS.FULL_URL,
				search:  serializeLibraryMetadataFilterSearch(nextFilters),
				replace: true,
			});
		},
		[
			isIgnoredScope,
			navigate,
		],
	);

	return {
		metadataFilters,
		handleMetadataFiltersChange,
	};
}
