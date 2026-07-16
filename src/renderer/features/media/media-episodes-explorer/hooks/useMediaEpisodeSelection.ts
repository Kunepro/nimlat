import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { resolveNextEpisodeSelection } from "../episode-selection";
import {
	getEpisodeBulkSelectionState,
	getSelectedEpisodeNumberList,
	pruneUnavailableEpisodeSelection,
	toEpisodeNumberSet,
} from "../media-episodes-explorer-model";

interface MediaEpisodeSelectionController {
	selectedEpisodeNumbers: ReadonlySet<number>;
	selectedEpisodeNumberList: number[];
	clearEpisodeSelection: () => void;
	toggleAllEpisodesSelection: () => void;
	handleEpisodeSelectionChange: (episodeNumber: number, isSelected: boolean, shouldExtendRange: boolean) => void;
}

export function useMediaEpisodeSelection(orderedEpisodeNumbers: readonly number[]): MediaEpisodeSelectionController {
	const [ selectedEpisodeNumbers, setSelectedEpisodeNumbers ] = useState<ReadonlySet<number>>(() => new Set());
	const lastSelectedEpisodeNumberRef                          = useRef<number | null>(null);

	const selectedEpisodeNumberList = useMemo(
		() => getSelectedEpisodeNumberList(
			orderedEpisodeNumbers,
			selectedEpisodeNumbers,
		),
		[
			orderedEpisodeNumbers,
			selectedEpisodeNumbers,
		],
	);

	useEffect(
		() => {
			const availableEpisodeNumbers = new Set(orderedEpisodeNumbers);

			setSelectedEpisodeNumbers((current) => {
				return pruneUnavailableEpisodeSelection(
					current,
					availableEpisodeNumbers,
				);
			});

			if (
				lastSelectedEpisodeNumberRef.current != null
				&& !availableEpisodeNumbers.has(lastSelectedEpisodeNumberRef.current)
			) {
				lastSelectedEpisodeNumberRef.current = null;
			}
		},
		[ orderedEpisodeNumbers ],
	);

	const handleEpisodeSelectionChange = useCallback(
		(
			episodeNumber: number,
			isSelected: boolean,
			shouldExtendRange: boolean,
		) => {
			const anchorEpisodeNumber = lastSelectedEpisodeNumberRef.current;
			setSelectedEpisodeNumbers(current => resolveNextEpisodeSelection(
				current,
				orderedEpisodeNumbers,
				{
					episodeNumber,
					isSelected,
					shouldExtendRange,
					anchorEpisodeNumber,
				},
			));
			// The anchor is stored in a ref so memoized virtual rows do not need to rerender
			// just because the shift-selection origin moved.
			lastSelectedEpisodeNumberRef.current = episodeNumber;
		},
		[ orderedEpisodeNumbers ],
	);

	const clearEpisodeSelection = useCallback(
		() => {
			setSelectedEpisodeNumbers(new Set());
			lastSelectedEpisodeNumberRef.current = null;
		},
		[],
	);

	const toggleAllEpisodesSelection = useCallback(
		() => {
			const isAllSelected = getEpisodeBulkSelectionState(
				selectedEpisodeNumberList.length,
				orderedEpisodeNumbers.length,
			) === "all";
			setSelectedEpisodeNumbers(isAllSelected ? new Set() : toEpisodeNumberSet(orderedEpisodeNumbers));
			// Keep shift-selection anchored at the visible end only when the bulk action
			// selects episodes; a clear-all action should not leave a hidden range origin.
			lastSelectedEpisodeNumberRef.current = isAllSelected
				? null
				: orderedEpisodeNumbers[ orderedEpisodeNumbers.length - 1 ] ?? null;
		},
		[
			orderedEpisodeNumbers,
			selectedEpisodeNumberList.length,
		],
	);

	return {
		selectedEpisodeNumbers,
		selectedEpisodeNumberList,
		clearEpisodeSelection,
		toggleAllEpisodesSelection,
		handleEpisodeSelectionChange,
	};
}
