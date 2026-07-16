import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useRef,
	useState,
} from "react";
import { useAppMessage } from "../../../../hooks";
import {
	formatLibraryActionError,
	getEffectiveLibraryWatchedState,
	rollbackLibraryWatchStateOverride,
	setLibraryItemWatchedState,
	setLibraryWatchStateOverride,
	shouldRollbackLibraryWatchState,
} from "../library-item-actions-model";
import { persistLibraryItemWatchState } from "../library-item-actions-runner";

interface LibraryItemWatchStateActionInput {
	requestWallReload: () => void;
	updateSelectedItem: (item: LibraryDisplayItem) => void;
}

interface LibraryItemWatchStateActionController {
	watchStateOverrides: ReadonlyMap<string, boolean>;
	handleWatchStateChange: (item: LibraryDisplayItem, nextWatched: boolean) => Promise<void>;
}

export function useLibraryItemWatchStateAction({
																								 requestWallReload,
																								 updateSelectedItem,
																							 }: LibraryItemWatchStateActionInput): LibraryItemWatchStateActionController {
	const messageApi = useAppMessage();
	// The Pixi wall reads pages independently from React state; watched overrides provide
	// immediate feedback until the next DB-backed wall range arrives.
	const [ watchStateOverrides, setWatchStateOverrides ] = useState<Map<string, boolean>>(() => new Map());
	const watchStateOverridesRef                          = useRef<Map<string, boolean>>(new Map());

	const handleWatchStateChange = useCallback(
		async (item: LibraryDisplayItem, nextWatched: boolean) => {
			const previousWatched          = getEffectiveLibraryWatchedState(
				item,
				watchStateOverridesRef.current,
			);
			const rollbackSelectedItem     = () => {
				updateSelectedItem(setLibraryItemWatchedState(
					item,
					previousWatched,
				));
			};
			const rollbackOverride         = () => {
				const shouldRollback = shouldRollbackLibraryWatchState(
					watchStateOverridesRef.current,
					item.key,
					nextWatched,
				);
				if (!shouldRollback) {
					return false;
				}
				const nextOverrides            = rollbackLibraryWatchStateOverride(
					watchStateOverridesRef.current,
					item.key,
					nextWatched,
					previousWatched,
				);
				watchStateOverridesRef.current = nextOverrides;
				setWatchStateOverrides(nextOverrides);
				return true;
			};
			const nextOverrides            = setLibraryWatchStateOverride(
				watchStateOverridesRef.current,
				item.key,
				nextWatched,
			);
			watchStateOverridesRef.current = nextOverrides;
			setWatchStateOverrides(nextOverrides);
			updateSelectedItem(setLibraryItemWatchedState(
				item,
				nextWatched,
			));
			try {
				const result = await persistLibraryItemWatchState(
					item,
					nextWatched,
				);

				if (result && !result.success) {
					messageApi.error(result.error);
					if (rollbackOverride()) {
						rollbackSelectedItem();
					}
					return;
				}

				requestWallReload();
			} catch (error) {
				if (rollbackOverride()) {
					rollbackSelectedItem();
				}
				messageApi.error(formatLibraryActionError(
					error,
					"Failed to update watched state.",
				));
			}
		},
		[
			requestWallReload,
			updateSelectedItem,
			messageApi,
		],
	);

	return {
		watchStateOverrides,
		handleWatchStateChange,
	};
}
