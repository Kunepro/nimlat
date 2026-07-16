import { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	createEmptyLibrarySelectionState,
	createLibrarySelectedKeySet,
	removeLibrarySelectedKeys,
	selectLibrarySelectedItems,
	toggleLibrarySelectedItem,
	updateLibrarySelectedItem,
} from "../library-selection-model";

interface UseLibrarySelectionStateResult {
	selectedItems: LibraryDisplayItem[];
	selectedCount: number;
	selectedKeySet: Set<string>;
	clearSelection: () => void;
	removeSelectedKeys: (keys: Set<string>) => void;
	toggleSelectedItem: (item: LibraryDisplayItem) => void;
	updateSelectedItem: (item: LibraryDisplayItem) => void;
}

export function useLibrarySelectionState(): UseLibrarySelectionStateResult {
	const [ selectionState, setSelectionState ] = useState(createEmptyLibrarySelectionState);

	const selectedItems  = useMemo(
		() => selectLibrarySelectedItems(selectionState),
		[ selectionState ],
	);
	const selectedKeySet = useMemo(
		() => createLibrarySelectedKeySet(selectionState),
		[ selectionState ],
	);

	const clearSelection = useCallback(
		() => {
			setSelectionState(createEmptyLibrarySelectionState());
		},
		[],
	);

	const removeSelectedKeys = useCallback(
		(keys: Set<string>) => {
			setSelectionState(current => removeLibrarySelectedKeys(
				current,
				keys,
			));
		},
		[],
	);

	const toggleSelectedItem = useCallback(
		(item: LibraryDisplayItem) => {
			setSelectionState(current => toggleLibrarySelectedItem(
				current,
				item,
			));
		},
		[],
	);

	const updateSelectedItem = useCallback(
		(item: LibraryDisplayItem) => {
			setSelectionState(current => updateLibrarySelectedItem(
				current,
				item,
			));
		},
		[],
	);

	return {
		selectedItems,
		selectedCount: selectionState.selectedKeys.length,
		selectedKeySet,
		clearSelection,
		removeSelectedKeys,
		toggleSelectedItem,
		updateSelectedItem,
	};
}
