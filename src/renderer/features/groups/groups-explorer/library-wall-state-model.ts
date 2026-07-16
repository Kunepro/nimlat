export const BACKGROUND_WALL_RELOAD_THROTTLE_MS = 1500;

export interface LibraryWallStateSnapshot {
	errorMessage: string | null;
	hasLoadedInitialRange: boolean;
	totalItems: number;
	wallReloadKey: number | undefined;
	wallResetKey: number;
}

export interface LibraryWallReloadOptions {
	resetWall?: boolean;
	showInitialLoader?: boolean;
}

export function createInitialLibraryWallState(): LibraryWallStateSnapshot {
	return {
		errorMessage:          null,
		hasLoadedInitialRange: false,
		totalItems:            0,
		wallReloadKey:         undefined,
		wallResetKey:          0,
	};
}

export function formatLibraryWallLoadError(error: unknown): string {
	return error instanceof Error ? error.message : "Failed to load library.";
}

// A wall reload invalidates the current range token. Optional flags decide
// whether the mounted wall also shows its initial loader or resets scroll/range.
export function requestLibraryWallReload(
	current: LibraryWallStateSnapshot,
	{
		resetWall = false,
		showInitialLoader = false,
	}: LibraryWallReloadOptions = {},
): LibraryWallStateSnapshot {
	return {
		...current,
		errorMessage:          null,
		hasLoadedInitialRange: showInitialLoader ? false : current.hasLoadedInitialRange,
		wallReloadKey:         (current.wallReloadKey ?? 0) + 1,
		wallResetKey:          resetWall ? current.wallResetKey + 1 : current.wallResetKey,
	};
}

export function applyLibraryWallRangeLoaded(
	current: LibraryWallStateSnapshot,
	rangeTotal: number,
): LibraryWallStateSnapshot {
	return {
		...current,
		errorMessage:          null,
		hasLoadedInitialRange: true,
		totalItems:            rangeTotal,
	};
}

export function applyLibraryWallRangeLoadError(
	current: LibraryWallStateSnapshot,
	error: unknown,
): LibraryWallStateSnapshot {
	return {
		...current,
		errorMessage:          formatLibraryWallLoadError(error),
		hasLoadedInitialRange: true,
	};
}

export function applyLibraryWallVisibleItemsRemoved(
	current: LibraryWallStateSnapshot,
	removedCount: number,
): LibraryWallStateSnapshot {
	return {
		...current,
		totalItems: Math.max(
			0,
			current.totalItems - removedCount,
		),
	};
}

export function resetLibraryWallVisibleRange(current: LibraryWallStateSnapshot): LibraryWallStateSnapshot {
	return {
		...current,
		errorMessage:          null,
		hasLoadedInitialRange: false,
		totalItems:            0,
	};
}
