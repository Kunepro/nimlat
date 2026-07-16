import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	applyLibraryWallRangeLoaded,
	applyLibraryWallRangeLoadError,
	applyLibraryWallVisibleItemsRemoved,
	BACKGROUND_WALL_RELOAD_THROTTLE_MS,
	createInitialLibraryWallState,
	requestLibraryWallReload,
	resetLibraryWallVisibleRange,
} from "../library-wall-state-model";

interface UseLibraryWallStateResult {
	hasLoadedInitialRange: boolean;
	totalItems: number;
	errorMessage: string | null;
	wallReloadKey: number | undefined;
	wallResetKey: number;
	handleRangeLoaded: (rangeTotal: number) => void;
	handleRangeLoadError: (error: unknown) => void;
	onVisibleItemsRemoved: (removedCount: number) => void;
	requestBackgroundWallReload: () => void;
	requestWallReload: (showInitialLoader?: boolean, resetWall?: boolean) => void;
	resetVisibleRange: () => void;
}

export function useLibraryWallState(): UseLibraryWallStateResult {
	const [ wallState, setWallState ]    = useState(createInitialLibraryWallState);
	const backgroundWallReloadTimeoutRef = useRef<number | null>(null);

	const requestWallReload = useCallback(
		(showInitialLoader: boolean = false, resetWall: boolean = false) => {
			setWallState(current => requestLibraryWallReload(
				current,
				{
					resetWall,
					showInitialLoader,
				},
			));
		},
		[],
	);

	const requestBackgroundWallReload = useCallback(
		() => {
			if (backgroundWallReloadTimeoutRef.current !== null) {
				return;
			}

			// Hydrator and grouping daemons can publish thousands of renderer-visible
			// mutations while the library page is open. Coalesce those into periodic
			// wall reloads so stale in-flight ranges are allowed to settle and be GC'd.
			backgroundWallReloadTimeoutRef.current = window.setTimeout(
				() => {
					backgroundWallReloadTimeoutRef.current = null;
					requestWallReload();
				},
				BACKGROUND_WALL_RELOAD_THROTTLE_MS,
			);
		},
		[ requestWallReload ],
	);

	const onVisibleItemsRemoved = useCallback(
		(removedCount: number) => {
			setWallState(current => applyLibraryWallVisibleItemsRemoved(
				current,
				removedCount,
			));
		},
		[],
	);

	const handleRangeLoaded = useCallback(
		(rangeTotal: number) => {
			setWallState(current => applyLibraryWallRangeLoaded(
				current,
				rangeTotal,
			));
		},
		[],
	);

	const handleRangeLoadError = useCallback(
		(error: unknown) => {
			setWallState(current => applyLibraryWallRangeLoadError(
				current,
				error,
			));
		},
		[],
	);

	const resetVisibleRange = useCallback(
		() => {
			setWallState(resetLibraryWallVisibleRange);
		},
		[],
	);

	useEffect(
		() => () => {
			if (backgroundWallReloadTimeoutRef.current !== null) {
				window.clearTimeout(backgroundWallReloadTimeoutRef.current);
				backgroundWallReloadTimeoutRef.current = null;
			}
		},
		[],
	);

	return {
		hasLoadedInitialRange: wallState.hasLoadedInitialRange,
		totalItems:            wallState.totalItems,
		errorMessage:          wallState.errorMessage,
		wallReloadKey:         wallState.wallReloadKey,
		wallResetKey:          wallState.wallResetKey,
		handleRangeLoaded,
		handleRangeLoadError,
		onVisibleItemsRemoved,
		requestBackgroundWallReload,
		requestWallReload,
		resetVisibleRange,
	};
}
