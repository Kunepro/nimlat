import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";

export interface LibrarySelectionState {
	selectedItemsByKey: ReadonlyMap<string, LibraryDisplayItem>;
	selectedKeys: string[];
}

export function createEmptyLibrarySelectionState(): LibrarySelectionState {
	return {
		selectedItemsByKey: new Map(),
		selectedKeys:       [],
	};
}

export function selectLibrarySelectedItems({
																						 selectedItemsByKey,
																						 selectedKeys,
																					 }: LibrarySelectionState): LibraryDisplayItem[] {
	return selectedKeys
		.map(key => selectedItemsByKey.get(key))
		.filter((item): item is LibraryDisplayItem => Boolean(item));
}

export function createLibrarySelectedKeySet({
																							selectedKeys,
																						}: LibrarySelectionState): Set<string> {
	return new Set(selectedKeys);
}

export function removeLibrarySelectedKeys(
	state: LibrarySelectionState,
	keys: ReadonlySet<string>,
): LibrarySelectionState {
	if (keys.size === 0) {
		return state;
	}

	const selectedItemsByKey = new Map(state.selectedItemsByKey);
	keys.forEach(key => selectedItemsByKey.delete(key));

	return {
		selectedItemsByKey,
		selectedKeys: state.selectedKeys.filter(key => !keys.has(key)),
	};
}

export function toggleLibrarySelectedItem(
	state: LibrarySelectionState,
	item: LibraryDisplayItem,
): LibrarySelectionState {
	const selectedItemsByKey = new Map(state.selectedItemsByKey);
	const isSelected         = selectedItemsByKey.has(item.key);

	if (isSelected) {
		selectedItemsByKey.delete(item.key);
		return {
			selectedItemsByKey,
			selectedKeys: state.selectedKeys.filter(key => key !== item.key),
		};
	}

	selectedItemsByKey.set(
		item.key,
		item,
	);

	return {
		selectedItemsByKey,
		selectedKeys: [
			...state.selectedKeys,
			item.key,
		],
	};
}

export function updateLibrarySelectedItem(
	state: LibrarySelectionState,
	item: LibraryDisplayItem,
): LibrarySelectionState {
	if (!state.selectedItemsByKey.has(item.key)) {
		return state;
	}

	const selectedItemsByKey = new Map(state.selectedItemsByKey);
	selectedItemsByKey.set(
		item.key,
		item,
	);

	return {
		...state,
		selectedItemsByKey,
	};
}
