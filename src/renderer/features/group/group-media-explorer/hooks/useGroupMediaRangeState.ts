import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { MediaWallLoadedRange } from "@nimlat/types/media-wall";
import {
	useCallback,
	useState,
} from "react";

interface GroupMediaRangeStateController {
	hasLoadedMediaRange: boolean;
	mediaRangeErrorMessage: string | null;
	totalMediaItems: number;
	loadedMediaIds: ReadonlySet<number>;
	wallReloadKey: number | undefined;
	decrementTotalMediaItems: (count: number) => void;
	handleRangeLoaded: (range: MediaWallLoadedRange<GroupInspectionMediaCard>) => void;
	handleRangeLoadError: (error: unknown) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
	resetMediaRange: () => void;
}

export function useGroupMediaRangeState(): GroupMediaRangeStateController {
	const [ hasLoadedMediaRange, setLoadedMediaRange ]          = useState(false);
	const [ mediaRangeErrorMessage, setMediaRangeErrorMessage ] = useState<string | null>(null);
	const [ totalMediaItems, setTotalMediaItems ]               = useState(0);
	const [ loadedMediaIds, setLoadedMediaIds ] = useState<Set<number>>(() => new Set());
	const [ wallReloadKey, setWallReloadKey ]                   = useState<number | undefined>(undefined);

	const requestWallReload = useCallback(
		(showInitialLoader: boolean = false) => {
			if (showInitialLoader) {
				setLoadedMediaRange(false);
			}
			setMediaRangeErrorMessage(null);
			setWallReloadKey((current) => (current ?? 0) + 1);
		},
		[],
	);

	const handleRangeLoaded = useCallback(
		(range: MediaWallLoadedRange<GroupInspectionMediaCard>) => {
			setTotalMediaItems(range.total);
			setLoadedMediaIds(new Set(range.items.map(media => media.mediaId)));
			setLoadedMediaRange(true);
			setMediaRangeErrorMessage(null);
		},
		[],
	);

	const handleRangeLoadError = useCallback(
		(error: unknown) => {
			setLoadedMediaRange(true);
			setMediaRangeErrorMessage(error instanceof Error ? error.message : "Failed to load group titles.");
		},
		[],
	);

	const decrementTotalMediaItems = useCallback(
		(count: number) => {
			setTotalMediaItems(current => Math.max(
				0,
				current - count,
			));
		},
		[],
	);

	const resetMediaRange = useCallback(
		() => {
			setLoadedMediaRange(false);
			setMediaRangeErrorMessage(null);
			setTotalMediaItems(0);
			setLoadedMediaIds(new Set());
		},
		[],
	);

	return {
		hasLoadedMediaRange,
		mediaRangeErrorMessage,
		totalMediaItems,
		loadedMediaIds,
		wallReloadKey,
		decrementTotalMediaItems,
		handleRangeLoaded,
		handleRangeLoadError,
		requestWallReload,
		resetMediaRange,
	};
}
