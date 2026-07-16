import {
	atom,
	useAtom,
} from "jotai";
import { atomFamily } from "jotai/utils";
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import type {
	MediaWallDiagnosticsSnapshot,
	MediaWallLoadedRange,
	MediaWallSize,
} from "../types/media-wall";

function createEmptyRange<TItem>(): MediaWallLoadedRange<TItem> {
	return {
		offset: 0,
		total:  0,
		items:  [],
	};
}

function createHostAtom<TValue>(hostKey: string, initialValue: TValue) {
	void hostKey;
	return atom(initialValue);
}

const sizeAtomFamily = atomFamily((hostKey: string) => createHostAtom<MediaWallSize>(
	hostKey,
	{
		width:  1,
		height: 1,
	},
));

const rangeAtomFamily               = atomFamily((hostKey: string) => createHostAtom<MediaWallLoadedRange<unknown>>(
	hostKey,
	createEmptyRange<unknown>(),
));
const hoveredIndexAtomFamily        = atomFamily((hostKey: string) => createHostAtom<number | null>(
	hostKey,
	null,
));
const selectedIndexAtomFamily       = atomFamily((hostKey: string) => createHostAtom<number | null>(
	hostKey,
	null,
));
const focusedIndexAtomFamily        = atomFamily((hostKey: string) => createHostAtom<number | null>(
	hostKey,
	null,
));
const overlayScrollTopAtomFamily    = atomFamily((hostKey: string) => createHostAtom(
	hostKey,
	0,
));
const diagnosticsEnabledAtomFamily  = atomFamily((hostKey: string) => createHostAtom(
	hostKey,
	false,
));
const diagnosticsSnapshotAtomFamily = atomFamily((hostKey: string) => createHostAtom<MediaWallDiagnosticsSnapshot | null>(
	hostKey,
	null,
));

interface PixiMediaWallState<TItem> {
	size: MediaWallSize;
	setSize: Dispatch<SetStateAction<MediaWallSize>>;
	rangeState: MediaWallLoadedRange<TItem>;
	setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>;
	hoveredIndex: number | null;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	selectedIndex: number | null;
	setSelectedIndex: Dispatch<SetStateAction<number | null>>;
	focusedIndex: number | null;
	setFocusedIndex: Dispatch<SetStateAction<number | null>>;
	overlayScrollTop: number;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	isDiagnosticsEnabled: boolean;
	setDiagnosticsEnabled: Dispatch<SetStateAction<boolean>>;
	diagnosticsSnapshot: MediaWallDiagnosticsSnapshot;
	setDiagnosticsSnapshot: Dispatch<SetStateAction<MediaWallDiagnosticsSnapshot>>;
}

export function usePixiMediaWallState<TItem>(
	hostKey: string,
	createInitialDiagnosticsSnapshot: () => MediaWallDiagnosticsSnapshot,
): PixiMediaWallState<TItem> {
	const [ size, setSize ]                                                              = useAtom(sizeAtomFamily(hostKey));
	const [ unknownRangeState, setUnknownRangeState ]                                    = useAtom(rangeAtomFamily(hostKey));
	const [ hoveredIndex, setHoveredIndex ]                                              = useAtom(hoveredIndexAtomFamily(hostKey));
	const [ selectedIndex, setSelectedIndex ]                                            = useAtom(selectedIndexAtomFamily(hostKey));
	const [ focusedIndex, setFocusedIndex ]                                              = useAtom(focusedIndexAtomFamily(hostKey));
	const [ overlayScrollTop, setOverlayScrollTop ]                                      = useAtom(overlayScrollTopAtomFamily(hostKey));
	const [ isDiagnosticsEnabled, setDiagnosticsEnabled ]                                = useAtom(diagnosticsEnabledAtomFamily(hostKey));
	const [ nullableDiagnosticsSnapshot, setSnapshotOrNull ]                             = useAtom(diagnosticsSnapshotAtomFamily(hostKey));
	const diagnosticsSnapshot                                                            = useMemo(
		() => nullableDiagnosticsSnapshot ?? createInitialDiagnosticsSnapshot(),
		[
			createInitialDiagnosticsSnapshot,
			nullableDiagnosticsSnapshot,
		],
	);
	const setRangeState: Dispatch<SetStateAction<MediaWallLoadedRange<TItem>>>           = useCallback(
		(value) => {
			setUnknownRangeState((current) => {
				const typedCurrent = current as MediaWallLoadedRange<TItem>;
				return typeof value === "function"
					? (value as (currentValue: MediaWallLoadedRange<TItem>) => MediaWallLoadedRange<TItem>)(typedCurrent)
					: value;
			});
		},
		[ setUnknownRangeState ],
	);
	const setDiagnosticsSnapshot: Dispatch<SetStateAction<MediaWallDiagnosticsSnapshot>> = useCallback(
		(value) => {
			setSnapshotOrNull((current) => {
				const resolvedCurrent = current ?? createInitialDiagnosticsSnapshot();
				return typeof value === "function"
					? (value as (currentValue: MediaWallDiagnosticsSnapshot) => MediaWallDiagnosticsSnapshot)(resolvedCurrent)
					: value;
			});
		},
		[
			createInitialDiagnosticsSnapshot,
			setSnapshotOrNull,
		],
	);

	useEffect(
		() => () => {
			sizeAtomFamily.remove(hostKey);
			rangeAtomFamily.remove(hostKey);
			hoveredIndexAtomFamily.remove(hostKey);
			selectedIndexAtomFamily.remove(hostKey);
			focusedIndexAtomFamily.remove(hostKey);
			overlayScrollTopAtomFamily.remove(hostKey);
			diagnosticsEnabledAtomFamily.remove(hostKey);
			diagnosticsSnapshotAtomFamily.remove(hostKey);
		},
		[ hostKey ],
	);

	return {
		size,
		setSize,
		rangeState: unknownRangeState as MediaWallLoadedRange<TItem>,
		setRangeState,
		hoveredIndex,
		setHoveredIndex,
		selectedIndex,
		setSelectedIndex,
		focusedIndex,
		setFocusedIndex,
		overlayScrollTop,
		setOverlayScrollTop,
		isDiagnosticsEnabled,
		setDiagnosticsEnabled,
		diagnosticsSnapshot,
		setDiagnosticsSnapshot,
	};
}
