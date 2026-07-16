export interface EpisodeSelectionChange {
	episodeNumber: number;
	isSelected: boolean;
	shouldExtendRange: boolean;
	anchorEpisodeNumber: number | null;
}

// Range selection must use the full ordered episode snapshot, not the virtualized
// rows currently mounted in the DOM, so offscreen episode ranges remain selectable.
export function resolveNextEpisodeSelection(
	currentSelection: ReadonlySet<number>,
	orderedEpisodeNumbers: readonly number[],
	change: EpisodeSelectionChange,
): Set<number> {
	const nextSelection = new Set(currentSelection);
	const currentIndex  = orderedEpisodeNumbers.indexOf(change.episodeNumber);
	const anchorIndex   = change.anchorEpisodeNumber == null
		? -1
		: orderedEpisodeNumbers.indexOf(change.anchorEpisodeNumber);

	if (change.shouldExtendRange && currentIndex >= 0 && anchorIndex >= 0) {
		const startIndex = Math.min(
			currentIndex,
			anchorIndex,
		);
		const endIndex   = Math.max(
			currentIndex,
			anchorIndex,
		);

		orderedEpisodeNumbers.slice(
			startIndex,
			endIndex + 1,
		).forEach((episodeNumber) => {
			if (change.isSelected) {
				nextSelection.add(episodeNumber);
			} else {
				nextSelection.delete(episodeNumber);
			}
		});

		return nextSelection;
	}

	if (change.isSelected) {
		nextSelection.add(change.episodeNumber);
	} else {
		nextSelection.delete(change.episodeNumber);
	}

	return nextSelection;
}
